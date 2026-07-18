import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Key Pool ───────────────────────────────────────────────────────────────
const SERVER_KEYS = [
  '343aa853a7msh1bcf722e1b64529p137288jsnf27fe0e15b25',
  '626dc32a51msh5af4ac2415b9168p1f6ec2jsnafd7f2c110b',
  'd1c2c2d744msh75922ce8cfb3825p15e4d4jsn04edfae5787'
];

const userContributedKeys: string[] = [];

function getKeyList(userKey?: string): string[] {
  const list: string[] = [];
  
  // User provided key ALWAYS goes first (highest priority)
  if (userKey && userKey.length > 10) {
    list.push(userKey);
  }
  
  // Then contributed keys
  list.push(...userContributedKeys.filter(k => k !== userKey));
  
  // Finally server keys as fallback
  list.push(...SERVER_KEYS.filter(k => k !== userKey));
  
  return [...new Set(list)]; // Remove duplicates
}

function isFailedResponse(data: any): boolean {
  if (!data) return true;
  if (data.message) {
    const msg = String(data.message).toLowerCase();
    return (
      msg.includes('not subscribed') ||
      msg.includes('quota') ||
      msg.includes('exceeded') ||
      msg.includes('unauthorized') ||
      msg.includes('invalid api key') ||
      msg.includes('access denied') ||
      msg.includes('forbidden') ||
      msg.includes('error')
    );
  }
  // If no user data found, consider it failed
  if (!data.user && !data.users && !data.pk && !data.pk_id && !data.id) {
    return true;
  }
  return false;
}

async function fetchWithKeyRotation(
  url: string,
  userKey?: string
): Promise<{ success: boolean; data?: any; error?: string; usedKey?: string }> {
  const keys = getKeyList(userKey);
  let lastError = '';
  let userKeyError = '';

  console.log(`[API] Trying ${keys.length} keys for URL: ${url.substring(0, 60)}...`);

  for (const key of keys) {
    try {
      console.log(`[API] Trying key: ${key.substring(0, 12)}...`);
      
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
        }
      });

      const data = await res.json();
      console.log(`[API] Response for key ${key.substring(0, 12)}:`, JSON.stringify(data).substring(0, 200));

      if (!isFailedResponse(data)) {
        console.log(`[API] Success with key: ${key.substring(0, 12)}...`);
        return { success: true, data, usedKey: key.substring(0, 8) + '...' };
      }

      // Save error message
      lastError = data.message || 'Unknown error';
      console.warn(`[API] Key ${key.substring(0, 12)}... failed: ${lastError}`);
      
      // If this was the user's key, save the specific error
      if (key === userKey) {
        userKeyError = lastError;
      }
    } catch (err: any) {
      console.warn(`[API] Key ${key.substring(0, 12)}... threw error:`, err.message);
      lastError = err.message || 'Network error';
    }
  }

  // If user's key was tried and failed, give specific error
  if (userKey && userKeyError) {
    return {
      success: false,
      error: `Your API key was rejected: "${userKeyError}". Please verify your key at https://rapidapi.com/for-sharm/api/flashapi1`
    };
  }

  // If we get here, all keys failed
  return {
    success: false,
    error: userKey 
      ? `All API keys failed. Last error: "${lastError}". Server keys may be exhausted.`
      : 'Server API keys exhausted. Please provide your own RapidAPI key.'
  };
}

function extractUserObject(data: any): any | null {
  if (data?.user && typeof data.user === 'object') return data.user;
  if (Array.isArray(data?.users) && data.users.length > 0) return data.users[0];
  if (data?.pk || data?.pk_id || data?.id) return data;
  return null;
}

function getUserId(user: any): string {
  return String(user?.pk_id || user?.pk || user?.id || '');
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const usageMap = new Map<string, { date: string; count: number }>();
const FREE_PER_DAY = 1;

function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    'unknown'
  );
}

function checkFreeUse(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10);
  const rec = usageMap.get(ip);
  if (!rec || rec.date !== today) {
    usageMap.set(ip, { date: today, count: 0 });
    return { allowed: true, remaining: FREE_PER_DAY };
  }
  const remaining = Math.max(0, FREE_PER_DAY - rec.count);
  return { allowed: remaining > 0, remaining };
}

function consumeFreeUse(ip: string) {
  const today = new Date().toISOString().slice(0, 10);
  const rec = usageMap.get(ip);
  if (!rec || rec.date !== today) {
    usageMap.set(ip, { date: today, count: 1 });
  } else {
    rec.count = Math.min(rec.count + 1, FREE_PER_DAY);
  }
}

function getRemainingUses(ip: string): number {
  const { remaining } = checkFreeUse(ip);
  return remaining;
}

// Serve static frontend
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));

// ─── Status ──────────────────────────────────────────────────────────────────
app.get('/api/status', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const remaining = getRemainingUses(ip);
  res.json({ 
    success: true, 
    freeUsesRemaining: remaining, 
    freeUsesPerDay: FREE_PER_DAY, 
    totalKeys: SERVER_KEYS.length + userContributedKeys.length 
  });
});

// ─── Contribute Key ───────────────────────────────────────────────────────────
app.post('/api/contribute-key', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || key.length < 10) {
    return res.status(400).json({ success: false, error: 'Invalid key' });
  }
  if (!userContributedKeys.includes(key) && !SERVER_KEYS.includes(key)) {
    userContributedKeys.unshift(key);
  }
  res.json({ 
    success: true, 
    message: 'Key added! You now have unlimited access.', 
    totalKeys: SERVER_KEYS.length + userContributedKeys.length 
  });
});

// ─── Lookup ───────────────────────────────────────────────────────────────────
app.get('/api/lookup', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const userKey = (req.headers['x-api-key'] as string) || undefined;
  const ip = getClientIp(req);

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  // Check rate limit only if no API key provided
  if (!userKey) {
    const rateCheck = checkFreeUse(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_REACHED',
        message: 'You have used your 1 free lookup today. Enter your RapidAPI key for unlimited access.',
        freeUsesRemaining: 0
      });
    }
  }

  const targetUser = username.trim().replace(/^@/, '').toLowerCase();
  console.log(`[LOOKUP] Looking up username: ${targetUser}, hasUserKey: ${!!userKey}`);

  const result = await fetchWithKeyRotation(
    `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${encodeURIComponent(targetUser)}`,
    userKey
  );

  if (!result.success) {
    console.error(`[LOOKUP] Failed for ${targetUser}:`, result.error);
    return res.status(503).json({ success: false, error: result.error });
  }

  const user = extractUserObject(result.data);
  if (!user) {
    console.error(`[LOOKUP] No user data in response for ${targetUser}:`, result.data);
    return res.status(404).json({ 
      success: false, 
      error: 'User not found. The account may not exist or be private.' 
    });
  }

  // Only consume free use if successful and no user key
  if (!userKey) consumeFreeUse(ip);

  const response = {
    success: true,
    userId: getUserId(user),
    followers: user.follower_count,
    following: user.following_count,
    postsCount: user.media_count,
    profilePic: user.profile_pic_url || user.profile_pic_url_hd || '',
    username: user.username || targetUser,
    fullName: user.full_name || '',
    isPrivate: user.is_private || false,
    freeUsesRemaining: userKey ? null : getRemainingUses(ip)
  };

  console.log(`[LOOKUP] Success for ${targetUser}: ID=${response.userId}`);
  res.json(response);
});

// ─── Media ────────────────────────────────────────────────────────────────────
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const userKey = (req.headers['x-api-key'] as string) || undefined;
  const ip = getClientIp(req);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  // Check rate limit only if no API key provided
  if (!userKey) {
    const rateCheck = checkFreeUse(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_REACHED',
        message: 'Daily free limit reached. Enter your RapidAPI key for unlimited access.'
      });
    }
  }

  console.log(`[MEDIA] Fetching media for userId: ${userId}, hasUserKey: ${!!userKey}`);

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
    console.error(`[MEDIA] Failed to fetch info for ${userId}:`, infoResult.error);
    return res.status(503).json({ success: false, error: infoResult.error });
  }

  // Only consume free use if successful and no user key
  if (!userKey) consumeFreeUse(ip);

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

  console.log(`[MEDIA] Success for ${userId}: ${images.length} images found`);

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

// SPA catch-all
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ rabto-ixta running at http://localhost:${PORT}`);
  console.log(`🔑 Key pool: ${SERVER_KEYS.length + userContributedKeys.length} keys`);
});