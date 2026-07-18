// Vercel Serverless entry point
// This file re-exports the Express app so Vercel can wrap it in a serverless function.

import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'rabto-ixta' });
});

// STEP 1: Get User ID from Username
app.get('/api/lookup', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const apiKey = req.headers['x-api-key'] as string;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key is required. Please enter your RapidAPI key in the app settings.' });
  }

  try {
    const response = await fetch(
      `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${encodeURIComponent(username)}`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
        }
      }
    );
    const data = await response.json();

    if (data.message) {
      return res.status(429).json({ success: false, error: data.message });
    }
    if (!data.user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userIdStr = String(data.user.id || data.user.pk_id || data.user.pk || '');

    res.json({
      success: true,
      userId: userIdStr,
      followers: data.user.follower_count,
      following: data.user.following_count,
      postsCount: data.user.media_count,
      profilePic: data.user.profile_pic_url
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// STEP 2: Get Similar Accounts / Images
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const apiKey = req.headers['x-api-key'] as string;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key is required.' });
  }

  try {
    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
    };

    const [infoRes, similarRes] = await Promise.all([
      fetch(`https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`, { headers }),
      fetch(`https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`, { headers })
    ]);

    const infoData = await infoRes.json();
    const similarData = await similarRes.json();

    if (infoData.message) {
      return res.status(429).json({ success: false, error: infoData.message });
    }

    const userInfo = infoData?.user || infoData;
    const items = similarData.users || similarData.items || [];

    const images = items.slice(0, 20).map((item: any, i: number) => ({
      id: `media-${i}`,
      url: item.profile_pic_url || item.profile_pic_url_hd || '',
      caption: `@${item.username || 'user'}`
    })).filter((img: any) => img.url);

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
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default app;
