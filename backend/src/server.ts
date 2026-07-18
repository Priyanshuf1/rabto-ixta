import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchWithRotation,
  addUserKey,
  getPoolStatus,
  extractUserObject,
  getUserId
} from './keyManager.js';
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

// ─── STATUS ──────────────────────────────────────────────────────────────────
app.get('/api/status', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const remaining = getRemainingUses(ip);
  const pool = getPoolStatus();
  res.json({ success: true, freeUsesRemaining: remaining, freeUsesPerDay: 1, keyPool: pool });
});

// ─── CONTRIBUTE KEY ───────────────────────────────────────────────────────────
app.post('/api/contribute-key', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key || key.length < 10) return res.status(400).json({ success: false, error: 'Invalid key' });
  addUserKey(key);
  res.json({ success: true, message: 'Key added! You now have unlimited access.', keyPool: getPoolStatus() });
});

// ─── LOOKUP ───────────────────────────────────────────────────────────────────
app.get('/api/lookup', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const userKey = (req.headers['x-api-key'] as string) || undefined;
  const ip = getClientIp(req);

  if (!username) return res.status(400).json({ success: false, error: 'Username is required' });

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

  if (username.toLowerCase() === 'shivvi.p') {
    return res.json({
      success: true,
      userId: '72829292895',
      followers: '10.5K',
      following: '250',
      postsCount: 42,
      profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      username: 'shivvi.p',
      fullName: 'Shivvi',
      isPrivate: false,
      freeUsesRemaining: userKey ? null : 0,
      mocked: true
    });
  }

  if (userKey) addUserKey(userKey);

  const result = await fetchWithRotation(
    `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${encodeURIComponent(username)}`,
    userKey
  );

  if (!result.success) {
    return res.status(503).json({ success: false, error: result.error, message: result.error });
  }

  // Normalize: handles both { user: {} } and { users: [...] }
  const user = extractUserObject(result.data);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found. Check the username and try again.' });
  }

  if (!userKey) consumeFreeUse(ip);

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
    freeUsesRemaining: userKey ? null : getRemainingUses(ip)
  });
});

// ─── MEDIA ────────────────────────────────────────────────────────────────────
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const userKey = (req.headers['x-api-key'] as string) || undefined;
  const ip = getClientIp(req);

  if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

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

  if (userId === '72829292895') {
    return res.json({
      success: true,
      images: [
        { id: 'm1', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80', caption: '@shivvi.p image 1' },
        { id: 'm2', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&q=80', caption: '@shivvi.p image 2' },
        { id: 'm3', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80', caption: '@shivvi.p image 3' }
      ],
      userInfo: {
        username: 'shivvi.p',
        followers: '10.5K',
        following: '250',
        postsCount: 42,
        profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
      },
      mocked: true
    });
  }

  if (userKey) addUserKey(userKey);

  const [infoResult, similarResult] = await Promise.all([
    fetchWithRotation(`https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`, userKey),
    fetchWithRotation(`https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`, userKey)
  ]);

  if (!infoResult.success) {
    return res.status(503).json({ success: false, error: infoResult.error, message: infoResult.error });
  }

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
  console.log(`🔑 Key pool: ${getPoolStatus().totalKeys} keys`);
});