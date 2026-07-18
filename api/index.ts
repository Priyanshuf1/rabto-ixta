import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Key Pool ───────────────────────────────────────────────────────────────
const SERVER_KEYS = [
  '343aa853a7msh1bcf722e1b64529p137288jsnf27fe0e15b25',
  '626dc32a51msh5af4ac2415b9168p1f6ec2jsnafd7f2c110b',
  'd1c2c2d744msh75922ce8cfb3825p15e4d4jsn04edfae5787'
];

// User-contributed keys stored in module scope (persists within the same Vercel function instance)
const userContributedKeys: string[] = [];

function getKeyList(userKey?: string): string[] {
  // ALWAYS try user's key FIRST — never shuffle
  const extra = [...userContributedKeys];
  if (userKey && !SERVER_KEYS.includes(userKey) && !extra.includes(userKey)) {
    extra.unshift(userKey); // user key goes first
  }
  return [...extra, ...SERVER_KEYS]; // user keys first, then server keys
}

function isFailedResponse(data: any): boolean {
  if (!data || !data.message) return false;
  const msg = String(data.message).toLowerCase();
  return (
    msg.includes('not subscribed') ||
    msg.includes('quota') ||
    msg.includes('exceeded') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid api key') ||
    msg.includes('access denied') ||
    msg.includes('forbidden')
  );
}

async function fetchWithKeyRotation(
  url: string,
  userKey?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const keys = getKeyList(userKey);

  for (const key of keys) {
    try {
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
        }
      });

      const data = await res.json();

      if (!isFailedResponse(data)) {
        return { success: true, data };
      }
      console.warn(`Key ${key.substring(0, 8)}... failed: ${data.message}`);
    } catch (err) {
      console.warn(`Key ${key.substring(0, 8)}... threw error`);
    }
  }

  return {
    success: false,
    error: keys.length === SERVER_KEYS.length
      ? 'Server API keys are exhausted. Please enter your own RapidAPI key to continue.'
      : 'All API keys (including yours) failed. Please check your RapidAPI subscription.'
  };
}

/**
 * Normalize the user object from either format:
 *   { user: { id, pk, pk_id, ... } }     ← some endpoints
 *   { users: [{ id, pk, pk_id, ... }] }  ← info_username endpoint
 */
function extractUserObject(data: any): any | null {
  if (data?.user && typeof data.user === 'object') return data.user;
  if (Array.isArray(data?.users) && data.users.length > 0) return data.users[0];
  // Some endpoints return the user object directly at root
  if (data?.pk || data?.pk_id || data?.id) return data;
  return null;
}

function getUserId(user: any): string {
  return String(user?.pk_id || user?.pk || user?.id || '');
}

function formatCount(n: any): string | number {
  const num = parseInt(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num;
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const usageMap = new Map<string, { date: string; count: number }>();
const FREE_PER_DAY = 1;

function getIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const rec = usageMap.get(ip);
  if (!rec || rec.date !== today) {
    usageMap.set(ip, { date: today, count: 0 });
    return { allowed: true, remaining: FREE_PER_DAY };
  }
  const remaining = Math.max(0, FREE_PER_DAY - rec.count);
  return { allowed: remaining > 0, remaining };
}

function consumeUse(ip: string) {
  const today = new Date().toISOString().slice(0, 10);
  const rec = usageMap.get(ip);
  if (!rec || rec.date !== today) {
    usageMap.set(ip, { date: today, count: 1 });
  } else {
    rec.count = Math.min(rec.count + 1, FREE_PER_DAY);
  }
}

// ─── Status endpoint ──────────────────────────────────────────────────────────
app.get('/api/status', (req: Request, res: Response) => {
  const ip = getIp(req);
  const { remaining } = checkRateLimit(ip);
  res.json({
    success: true,
    freeUsesRemaining: remaining,
    freeUsesPerDay: FREE_PER_DAY,
    totalKeys: SERVER_KEYS.length + userContributedKeys.length
  });
});

// ─── Contribute Key endpoint ──────────────────────────────────────────────────
app.post('/api/contribute-key', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || key.length < 10) {
    return res.status(400).json({ success: false, error: 'Invalid key' });
  }
  if (!userContributedKeys.includes(key) && !SERVER_KEYS.includes(key)) {
    userContributedKeys.push(key);
  }
  res.json({
    success: true,
    message: 'Key received! You now have priority access.',
    totalKeys: SERVER_KEYS.length + userContributedKeys.length
  });
});

// ─── Lookup endpoint ──────────────────────────────────────────────────────────
app.get('/api/lookup', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const userKey = (req.headers['x-api-key'] as string) || undefined;
  const ip = getIp(req);

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  // Rate limit only when no user key is present
  if (!userKey) {
    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_REACHED',
        message: 'You have used your 1 free lookup today. Enter your RapidAPI key for unlimited access.',
        freeUsesRemaining: 0
      });
    }
  }

  const url = `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${encodeURIComponent(username)}`;
  const result = await fetchWithKeyRotation(url, userKey);

  if (!result.success) {
    return res.status(503).json({ success: false, error: 'API_POOL_EXHAUSTED', message: result.error });
  }

  // Normalize response — API returns EITHER { user: {} } OR { users: [...] }
  const user = extractUserObject(result.data);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found. Check the username and try again.' });
  }

  if (!userKey) consumeUse(ip);

  res.json({
    success: true,
    userId: getUserId(user),
    followers: user.follower_count,
    following: user.following_count,
    postsCount: user.media_count,
    profilePic: user.profile_pic_url || user.profile_pic_url_hd || '',
    username: user.username || username,
    fullName: user.full_name || '',
    isPrivate: user.is_private || false,
    freeUsesRemaining: userKey ? null : 0
  });
});

// ─── Media endpoint ───────────────────────────────────────────────────────────
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const userKey = (req.headers['x-api-key'] as string) || undefined;
  const ip = getIp(req);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  if (!userKey) {
    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_REACHED',
        message: 'Daily free limit reached. Enter your RapidAPI key for unlimited access.'
      });
    }
  }

  // Fetch user info and similar accounts in parallel
  const [infoResult, similarResult] = await Promise.all([
    fetchWithKeyRotation(
      `https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`,
      userKey
    ),
    fetchWithKeyRotation(
      `https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`,
      userKey
    )
  ]);

  if (!infoResult.success) {
    return res.status(503).json({ success: false, error: 'API_POOL_EXHAUSTED', message: infoResult.error });
  }

  if (!userKey) consumeUse(ip);

  const userInfo = extractUserObject(infoResult.data);
  const similarData = similarResult.success ? similarResult.data : {};
  const items: any[] = similarData?.users || similarData?.items || [];

  const images = items
    .slice(0, 20)
    .map((item: any, i: number) => ({
      id: `media-${i}`,
      url: item.profile_pic_url || item.profile_pic_url_hd || '',
      caption: `@${item.username || 'user'}`
    }))
    .filter((img: any) => img.url);

  res.json({
    success: true,
    images,
    userInfo: {
      username: userInfo?.username || '',
      followers: userInfo?.follower_count || 0,
      following: userInfo?.following_count || 0,
      postsCount: userInfo?.media_count || 0,
      profilePic: userInfo?.profile_pic_url || userInfo?.profile_pic_url_hd || ''
    }
  });
});

export default app;
