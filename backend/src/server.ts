import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRotation, addUserKey, getPoolStatus } from './keyManager.js';
import { checkFreeUse, consumeFreeUse, getRemainingUses, getClientIp } from './rateLimit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve static frontend
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));

// ─────────────────────────────────────────────
// STATUS endpoint — shows key pool info
// ─────────────────────────────────────────────
app.get('/api/status', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const remaining = getRemainingUses(ip);
  const pool = getPoolStatus();
  res.json({
    success: true,
    freeUsesRemaining: remaining,
    freeUsesPerDay: 1,
    keyPool: pool
  });
});

// ─────────────────────────────────────────────
// CONTRIBUTE KEY endpoint — user adds their key
// ─────────────────────────────────────────────
app.post('/api/contribute-key', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || key.length < 10) {
    return res.status(400).json({ success: false, error: 'Invalid key' });
  }
  addUserKey(key);
  const ip = getClientIp(req);
  // Reward the user: reset their daily limit when they contribute
  const pool = getPoolStatus();
  res.json({
    success: true,
    message: 'Key added to pool! You now have unlimited access.',
    keyPool: pool
  });
});

// ─────────────────────────────────────────────
// LOOKUP endpoint — Username → User ID
// ─────────────────────────────────────────────
app.get('/api/lookup', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const userKey = req.headers['x-api-key'] as string | undefined;
  const ip = getClientIp(req);

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  // Rate limiting: if no user key provided, check free limit
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

  // If user provided a key, add to pool for future rotation
  if (userKey) {
    addUserKey(userKey);
  }

  // Make API call with rotation
  const result = await fetchWithRotation(
    (key) => `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${encodeURIComponent(username)}`,
    userKey
  );

  if (!result.success) {
    return res.status(503).json({
      success: false,
      error: 'API_POOL_EXHAUSTED',
      message: result.error
    });
  }

  const data = result.data;

  if (data.message) {
    return res.status(429).json({ success: false, error: data.message });
  }
  if (!data.user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Consume free use only on success
  if (!userKey) {
    consumeFreeUse(ip);
  }

  const userIdStr = String(
    data.user.id || data.user.pk_id || data.user.pk || ''
  );

  res.json({
    success: true,
    userId: userIdStr,
    followers: data.user.follower_count,
    following: data.user.following_count,
    postsCount: data.user.media_count,
    profilePic: data.user.profile_pic_url,
    freeUsesRemaining: userKey ? null : getRemainingUses(ip)
  });
});

// ─────────────────────────────────────────────
// MEDIA endpoint — Similar Accounts & Images
// ─────────────────────────────────────────────
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const userKey = req.headers['x-api-key'] as string | undefined;
  const ip = getClientIp(req);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  // Rate limiting
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

  if (userKey) {
    addUserKey(userKey);
  }

  // Fetch info and similar accounts in parallel
  const [infoResult, similarResult] = await Promise.all([
    fetchWithRotation(
      (key) => `https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`,
      userKey
    ),
    fetchWithRotation(
      (key) => `https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`,
      userKey
    )
  ]);

  if (!infoResult.success) {
    return res.status(503).json({ success: false, error: infoResult.error });
  }

  const infoData = infoResult.data;
  if (infoData.message) {
    return res.status(429).json({ success: false, error: infoData.message });
  }

  if (!userKey) {
    consumeFreeUse(ip);
  }

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
    },
    freeUsesRemaining: userKey ? null : getRemainingUses(ip)
  });
});

// SPA catch-all
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ rabto-ixta running at http://localhost:${PORT}`);
  console.log(`🔑 Key pool initialized with ${getPoolStatus().totalKeys} keys`);
});