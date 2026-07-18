import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Key Pool ───────────────────────────────────────────────────────────────
const SERVER_KEYS = [
  'REDACTED_API_KEY_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  '626dc32a51msh5af4ac2415b9168p1f6ec2jsnafd7f2c110b',
  'd1c2c2d744msh75922ce8cfb3825p15e4d4jsn04edfae5787'
];

// Vercel is serverless (stateless per request), so rotation is randomized
function pickKeys(userKey?: string): string[] {
  const pool = userKey ? [userKey, ...SERVER_KEYS] : [...SERVER_KEYS];
  // Shuffle to distribute load across keys
  return pool.sort(() => Math.random() - 0.5);
}

async function fetchWithRotation(urlFn: (key: string) => string, userKey?: string) {
  const keys = pickKeys(userKey);
  for (const key of keys) {
    try {
      const res = await fetch(urlFn(key), {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
        }
      });
      const data = await res.json();
      const failed = data.message && (
        data.message.toLowerCase().includes('not subscribed') ||
        data.message.toLowerCase().includes('quota') ||
        data.message.toLowerCase().includes('exceeded') ||
        data.message.toLowerCase().includes('unauthorized')
      );
      if (!failed) return { success: true, data };
      console.warn(`Key ${key.substring(0,8)}... failed: ${data.message}`);
    } catch (_) {}
  }
  return { success: false, data: null, error: 'All API keys exhausted. Please contribute your key.' };
}

// ─── Rate Limiting (in-memory, resets per cold start on Vercel) ─────────────
// For Vercel, we rely on client-side tracking via frontend localStorage
// Server rate limit here is a secondary protection
const usageMap = new Map<string, { date: string; count: number }>();
const FREE_PER_DAY = 1;

function getIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
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
    rec.count++;
  }
}

// ─── Status endpoint ─────────────────────────────────────────────────────────
app.get('/api/status', (req: Request, res: Response) => {
  const ip = getIp(req);
  const { remaining } = checkRateLimit(ip);
  res.json({ success: true, freeUsesRemaining: remaining, freeUsesPerDay: FREE_PER_DAY, totalKeys: SERVER_KEYS.length });
});

// ─── Contribute Key endpoint ─────────────────────────────────────────────────
app.post('/api/contribute-key', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || key.length < 10) return res.status(400).json({ success: false, error: 'Invalid key' });
  res.json({ success: true, message: 'Key received! You now have unlimited access for this session.' });
});

// ─── Lookup endpoint ─────────────────────────────────────────────────────────
app.get('/api/lookup', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const userKey = req.headers['x-api-key'] as string | undefined;
  const ip = getIp(req);

  if (!username) return res.status(400).json({ success: false, error: 'Username is required' });

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

  const result = await fetchWithRotation(
    (key) => `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${encodeURIComponent(username)}`,
    userKey
  );

  if (!result.success) return res.status(503).json({ success: false, message: result.error });

  const data = result.data;
  if (data.message) return res.status(429).json({ success: false, error: data.message });
  if (!data.user) return res.status(404).json({ success: false, error: 'User not found' });

  if (!userKey) consumeUse(ip);

  res.json({
    success: true,
    userId: String(data.user.id || data.user.pk_id || data.user.pk || ''),
    followers: data.user.follower_count,
    following: data.user.following_count,
    postsCount: data.user.media_count,
    profilePic: data.user.profile_pic_url,
    freeUsesRemaining: userKey ? null : Math.max(0, FREE_PER_DAY - 1)
  });
});

// ─── Media endpoint ───────────────────────────────────────────────────────────
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const userKey = req.headers['x-api-key'] as string | undefined;
  const ip = getIp(req);

  if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

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

  const [infoResult, similarResult] = await Promise.all([
    fetchWithRotation((key) => `https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`, userKey),
    fetchWithRotation((key) => `https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`, userKey)
  ]);

  if (!infoResult.success) return res.status(503).json({ success: false, message: infoResult.error });

  const infoData = infoResult.data;
  if (infoData.message) return res.status(429).json({ success: false, error: infoData.message });

  if (!userKey) consumeUse(ip);

  const userInfo = infoData?.user || infoData;
  const similarData = similarResult.success ? similarResult.data : { users: [] };
  const items = similarData?.users || similarData?.items || [];

  const images = items.slice(0, 20)
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
      profilePic: userInfo?.profile_pic_url || ''
    }
  });
});

export default app;
