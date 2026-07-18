import express, { Request, Response } from 'express';
import cors from 'cors';
import { Redis } from '@upstash/redis';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Key Pool ───────────────────────────────────────────────────────────────
const SERVER_KEYS = [
  'REDACTED_API_KEY_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  '626dc32a51msh5af4ac2415b9168p1f6ec2jsnafd7f2c110b',
  'd1c2c2d744msh75922ce8cfb3825p15e4d4jsn04edfae5787'
];

const redis = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) 
  ? new Redis({
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null;

const userContributedKeys: string[] = [];

async function getDbKeys(): Promise<string[]> {
  if (!redis) return [...userContributedKeys];
  try {
    const keys = await redis.smembers('valid_api_keys');
    return keys as string[];
  } catch (err) {
    console.error('Redis error:', err);
    return [...userContributedKeys];
  }
}

async function getKeyList(userKey?: string): Promise<string[]> {
  const list: string[] = [];
  
  // User provided key ALWAYS goes first (highest priority)
  if (userKey && userKey.length > 10) {
    list.push(userKey);
  }
  
  // Then contributed keys from DB
  const dbKeys = await getDbKeys();
  list.push(...dbKeys.filter(k => k !== userKey));
  
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
  const keys = await getKeyList(userKey);
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
app.get('/api/status', async (req: Request, res: Response) => {
  const ip = getIp(req);
  const { remaining } = checkRateLimit(ip);
  const dbKeys = await getDbKeys();
  res.json({
    success: true,
    freeUsesRemaining: remaining,
    freeUsesPerDay: FREE_PER_DAY,
    totalKeys: SERVER_KEYS.length + dbKeys.length,
    databaseConnected: !!redis
  });
});

// ─── Contribute Key endpoint ──────────────────────────────────────────────────
app.post('/api/contribute-key', async (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || key.length < 10) {
    return res.status(400).json({ success: false, error: 'Invalid key' });
  }
  
  // Validate the key with a lightweight request
  try {
    const testUrl = 'https://flashapi1.p.rapidapi.com/ig/info_username/?user=instagram';
    const testRes = await fetch(testUrl, {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
      }
    });
    const testData = await testRes.json();
    if (isFailedResponse(testData)) {
      return res.status(400).json({
        success: false,
        error: `Key validation failed. The API rejected this key (quota exceeded or invalid).`
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: `Network error during key validation.`
    });
  }

  // Save to DB
  if (redis) {
    await redis.sadd('valid_api_keys', key);
  } else {
    if (!userContributedKeys.includes(key)) {
      userContributedKeys.push(key);
    }
  }

  const dbKeys = await getDbKeys();
  res.json({
    success: true,
    message: redis ? 'Key validated and saved to persistent database!' : 'Key validated and saved to temporary memory (No Database Connected).',
    totalKeys: SERVER_KEYS.length + dbKeys.length
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

  // Check rate limit only if no API key provided
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

  const targetUser = username.trim().replace(/^@/, '').toLowerCase();
  const url = `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${encodeURIComponent(targetUser)}`;
  
  console.log(`[LOOKUP] Looking up username: ${targetUser}, hasUserKey: ${!!userKey}`);
  
  const result = await fetchWithKeyRotation(url, userKey);

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
  if (!userKey) consumeUse(ip);

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
    freeUsesRemaining: userKey ? null : 0
  };

  console.log(`[LOOKUP] Success for ${targetUser}: ID=${response.userId}`);
  res.json(response);
});

// ─── Media endpoint ───────────────────────────────────────────────────────────
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const userKey = (req.headers['x-api-key'] as string) || undefined;
  const ip = getIp(req);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  // Check rate limit only if no API key provided
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

  console.log(`[MEDIA] Fetching media for userId: ${userId}, hasUserKey: ${!!userKey}`);

  const [infoResult, similarResult, followersResult, followingResult] = await Promise.all([
    fetchWithKeyRotation(
      `https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`,
      userKey
    ),
    fetchWithKeyRotation(
      `https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`,
      userKey
    ),
    fetchWithKeyRotation(
      `https://flashapi1.p.rapidapi.com/ig/followers/?id_user=${userId}`,
      userKey
    ),
    fetchWithKeyRotation(
      `https://flashapi1.p.rapidapi.com/ig/following/?id_user=${userId}`,
      userKey
    )
  ]);

  if (!infoResult.success) {
    console.error(`[MEDIA] Failed to fetch info for ${userId}:`, infoResult.error);
    return res.status(503).json({ success: false, error: infoResult.error });
  }

  // Only consume free use if successful and no user key
  if (!userKey) consumeUse(ip);

  const userInfo = extractUserObject(infoResult.data);
  const similarData = similarResult.success ? similarResult.data : {};
  const followersData = followersResult.success ? followersResult.data : {};
  const followingData = followingResult.success ? followingResult.data : {};

  const similarItems: any[] = similarData?.users || similarData?.items || [];
  const followerItems: any[] = followersData?.users || followersData?.items || [];
  const followingItems: any[] = followingData?.users || followingData?.items || [];

  const rawItems = [...similarItems, ...followerItems, ...followingItems];
  
  // Deduplicate items
  const uniqueMap = new Map();
  for (const item of rawItems) {
    const key = item.pk || item.id || item.username;
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }
  const items = Array.from(uniqueMap.values());

  const images = items
    .slice(0, 40)
    .map((item: any, i: number) => ({
      id: `media-${item.username || i}`,
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

// ─── Image Proxy ──────────────────────────────────────────────────────────────
app.get('/api/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('No URL provided');
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    console.error('[PROXY] Error:', error);
    res.status(500).send('Error proxying image');
  }
});

export default app;
