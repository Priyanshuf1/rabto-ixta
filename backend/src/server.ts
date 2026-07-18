import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// ─── CORS Configuration ───────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// ─── Key Pool & Configuration ───────────────────────────────────────────────
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'flashapi1.p.rapidapi.com';
const RAPIDAPI_TIMEOUT_MS = parseInt(process.env.RAPIDAPI_TIMEOUT_MS || '10000', 10);

function getServerKeys(): string[] {
  const keys: string[] = [];
  if (process.env.RAPIDAPI_SERVER_KEY) keys.push(process.env.RAPIDAPI_SERVER_KEY);
  if (process.env.RAPIDAPI_SERVER_KEYS) {
    keys.push(...process.env.RAPIDAPI_SERVER_KEYS.split(',').map(k => k.trim()));
  }
  return [...new Set(keys)];
}

async function getKeyList(userKey?: string): Promise<string[]> {
  const list: string[] = [];
  
  if (userKey && userKey.trim().length > 10) {
    list.push(userKey.trim());
  }
  
  list.push(...getServerKeys().filter(k => k !== userKey));
  
  return [...new Set(list)];
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
  if (!data.user && !data.users && !data.pk && !data.pk_id && !data.id) {
    return true;
  }
  return false;
}

async function fetchWithKeyRotation(
  url: string,
  userKey?: string,
  endpointName: string = 'unknown'
): Promise<{ success: boolean; data?: any; error?: string; usedKey?: string }> {
  const keys = await getKeyList(userKey);
  let lastError = '';
  let userKeyError = '';

  for (const key of keys) {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), RAPIDAPI_TIMEOUT_MS);
      
      const options: RequestInit = {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        signal: controller.signal
      };
      
      let res;
      try {
        res = await fetch(url, options);
      } finally {
        clearTimeout(timeout);
      }

      const data = await res.json();
      const durationMs = Date.now() - startTime;
      const credentialSource = key === userKey ? 'user' : 'server';

      console.log(JSON.stringify({
        event: "rapidapi_request",
        endpoint: endpointName,
        status: res.status,
        durationMs,
        credentialSource
      }));

      if (!isFailedResponse(data)) {
        return { success: true, data };
      }

      lastError = data.message || 'Unknown error';
      if (key === userKey) {
        userKeyError = lastError;
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const credentialSource = key === userKey ? 'user' : 'server';
      
      console.log(JSON.stringify({
        event: "rapidapi_request",
        endpoint: endpointName,
        status: err.name === 'AbortError' ? 408 : 500,
        durationMs,
        credentialSource
      }));

      lastError = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error');
      if (key === userKey) userKeyError = lastError;
    }
  }

  if (userKey && userKeyError) {
    return {
      success: false,
      error: `Your API key was rejected: "${userKeyError}". Please verify your key at https://rapidapi.com/for-sharm/api/flashapi1`
    };
  }

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

async function checkFreeUse(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `ratelimit:${ip}:${today}`;
  
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const count = (await kv.get<number>(key)) || 0;
      const remaining = Math.max(0, FREE_PER_DAY - count);
      return { allowed: remaining > 0, remaining };
    } catch (err) {
      console.error('[KV] Rate limit check error:', err);
    }
  }

  const rec = usageMap.get(ip);
  if (!rec || rec.date !== today) {
    return { allowed: true, remaining: FREE_PER_DAY };
  }
  const remaining = Math.max(0, FREE_PER_DAY - rec.count);
  return { allowed: remaining > 0, remaining };
}

async function consumeFreeUse(ip: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `ratelimit:${ip}:${today}`;

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const count = await kv.incr(key);
      if (count === 1) await kv.expire(key, 86400);
      return;
    } catch (err) {
      console.error('[KV] Consume use error:', err);
    }
  }

  const rec = usageMap.get(ip);
  if (!rec || rec.date !== today) {
    usageMap.set(ip, { date: today, count: 1 });
  } else {
    rec.count = Math.min(rec.count + 1, FREE_PER_DAY);
  }
}

async function getRemainingUses(ip: string): Promise<number> {
  const { remaining } = await checkFreeUse(ip);
  return remaining;
}

// Serve static frontend
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));

// ─── Status endpoint ──────────────────────────────────────────────────────────
app.get('/api/status', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const remaining = await getRemainingUses(ip);
  const serverKeysCount = getServerKeys().length;
  res.json({ 
    success: true, 
    freeUsesRemaining: remaining, 
    freeUsesPerDay: FREE_PER_DAY, 
    totalKeys: serverKeysCount, // Only exposing private server keys count (if any)
    databaseConnected: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
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
    const rateCheck = await checkFreeUse(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_REACHED',
        message: 'Daily free limit reached. Enter your RapidAPI key for unlimited access.'
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
  if (!userKey) await consumeFreeUse(ip);

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

  console.log(`[MEDIA] Request received for userId: ${userId}`);

  // Check rate limit only if no API key provided
  if (!userKey) {
    const rateCheck = await checkFreeUse(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_REACHED',
        message: 'Daily free limit reached. Enter your RapidAPI key for unlimited access.'
      });
    }
  }

  const results = await Promise.allSettled([
    fetchWithKeyRotation(`https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`, userKey, 'info'),
    fetchWithKeyRotation(`https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`, userKey, 'similar'),
    fetchWithKeyRotation(`https://flashapi1.p.rapidapi.com/ig/followers/?id_user=${userId}`, userKey, 'followers'),
    fetchWithKeyRotation(`https://flashapi1.p.rapidapi.com/ig/following/?id_user=${userId}`, userKey, 'following')
  ]);

  const [infoResult, similarResult, followersResult, followingResult] = results;

  const infoResolved = infoResult.status === 'fulfilled' ? infoResult.value : { success: false, error: 'Unhandled rejection' };
  
  if (!infoResolved.success) {
    console.error(`[MEDIA] Failed to fetch info for ${userId}:`, infoResolved.error);
    return res.status(503).json({ success: false, error: infoResolved.error });
  }

  // Only consume free use if successful and no user key
  if (!userKey) await consumeFreeUse(ip);

  const userInfo = extractUserObject(infoResolved.data);
  
  const extractData = (result: PromiseSettledResult<any>) => 
    result.status === 'fulfilled' && result.value.success ? result.value.data : {};

  const similarData = extractData(similarResult);
  const followersData = extractData(followersResult);
  const followingData = extractData(followingResult);

  const similarItems: any[] = similarData?.users || similarData?.items || [];
  const followerItems: any[] = followersData?.users || followersData?.items || [];
  const followingItems: any[] = followingData?.users || followingData?.items || [];

  const rawItems = [...similarItems, ...followerItems, ...followingItems];
  
  // Deduplicate items using strongest identifier
  const uniqueMap = new Map();
  for (const item of rawItems) {
    // Avoid duplicating target account if somehow present
    if (String(item.pk || item.pk_id || item.id) === String(userId)) continue;
    
    const key = item.pk || item.pk_id || item.id || item.username;
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }
  const items = Array.from(uniqueMap.values());

  const images = items
    .filter((item: any) => item.profile_pic_url || item.profile_pic_url_hd) // Remove items with missing images
    .slice(0, 40) // Return reasonable capped number
    .map((item: any, i: number) => ({
      id: `media-${item.username || i}`,
      url: item.profile_pic_url || item.profile_pic_url_hd || '',
      caption: `@${item.username || 'user'}`
    }));

  console.log(JSON.stringify({
    event: "aggregation_complete",
    userId,
    similarCount: similarItems.length,
    followersCount: followerItems.length,
    followingCount: followingItems.length,
    uniqueImages: images.length
  }));
  
  res.json({
    success: true,
    images,
    userInfo: {
      username: userInfo?.username || '',
      followers: userInfo?.follower_count || 0,
      following: userInfo?.following_count || 0,
      postsCount: userInfo?.media_count || 0,
      profilePic: userInfo?.profile_pic_url || userInfo?.profile_pic_url_hd || ''
    },
    sourceSummary: {
      similarFetched: similarResult.status === 'fulfilled' && similarResult.value.success,
      followersFetched: followersResult.status === 'fulfilled' && followersResult.value.success,
      followingFetched: followingResult.status === 'fulfilled' && followingResult.value.success,
      uniqueImages: images.length
    }
  });
});

// ─── Image Proxy ──────────────────────────────────────────────────────────────
const proxyAllowedHosts = process.env.IMAGE_PROXY_ALLOWED_HOSTS
  ? process.env.IMAGE_PROXY_ALLOWED_HOSTS.split(',').map(h => h.trim())
  : ['scontent-*.cdninstagram.com', 'instagram.*.fbcdn.net', '*.fbcdn.net', '*.cdninstagram.com'];

// Helper to check wildcard domain matching
function isHostAllowed(hostname: string): boolean {
  for (const allowed of proxyAllowedHosts) {
    if (allowed.startsWith('*.')) {
      if (hostname.endsWith(allowed.slice(1))) return true;
    } else if (allowed.includes('*')) {
      const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      if (regex.test(hostname)) return true;
    } else {
      if (hostname === allowed) return true;
    }
  }
  return false;
}

app.get('/api/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send('No URL provided');
  }

  try {
    const parsedUrl = new URL(imageUrl);
    
    // SSRF Mitigation 1: Enforce HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return res.status(403).send('Only HTTPS allowed');
    }
    
    // SSRF Mitigation 2: Block local IP spaces (rudimentary check on hostname)
    if (['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname) || parsedUrl.hostname.startsWith('10.') || parsedUrl.hostname.startsWith('192.168.') || parsedUrl.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return res.status(403).send('Internal IPs blocked');
    }

    // SSRF Mitigation 3: Enforce allowlist
    if (!isHostAllowed(parsedUrl.hostname)) {
      return res.status(403).send('Host not allowed');
    }

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

// SPA catch-all
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n✅ rabto-ixta running at http://localhost:${PORT}`);
    console.log(`🔑 Server API keys loaded: ${process.env.RAPIDAPI_SERVER_KEYS ? process.env.RAPIDAPI_SERVER_KEYS.split(',').length : (process.env.RAPIDAPI_SERVER_KEY ? 1 : 0)}`);
  });
}

export default app;