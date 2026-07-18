import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Base route to check if server is running
app.get('/', (req, res) => {
  res.send('Instagram Backend is running! 🚀');
});

// STEP 1: Get User ID from Username
app.get('/api/lookup', async (req: Request, res: Response) => {
  const username = req.query.username as string;
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key is required' });
  }

  try {
    const response = await fetch(
      `https://flashapi1.p.rapidapi.com/ig/info_username/?user=${username}`,
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
    
    const userIdStr = data.user.id;

    res.json({ 
      success: true, 
      userId: String(userIdStr),
      followers: data.user.follower_count,
      following: data.user.following_count,
      postsCount: data.user.media_count,
      profilePic: data.user.profile_pic_url
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: 'API error' });
  }
});

// STEP 2: Get Media/Followers/Similar
app.get('/api/media/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key is required' });
  }

  try {
    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
    };

    // 1. Fetch User Info
    const infoRes = await fetch(`https://flashapi1.p.rapidapi.com/ig/info/?id_user=${userId}`, { headers });
    const infoData = await infoRes.json();
    
    if (infoData.message) {
      return res.status(429).json({ success: false, error: infoData.message });
    }
    
    const userInfo = infoData?.user || infoData;

    // 2. Fetch Similar Accounts
    const similarRes = await fetch(`https://flashapi1.p.rapidapi.com/ig/similar_accounts/?id_user=${userId}`, { headers });
    const similarData = await similarRes.json();
    
    // Extract items (users from similar_accounts)
    const items = similarData.users || similarData.items || [];
    
    const images = items.slice(0, 20).map((item: any, i: number) => {
      const followerUrl = item.profile_pic_url || item.profile_pic_url_hd;
      
      return {
        id: `media-${i}`,
        url: followerUrl || '',
        caption: `@${item.username || item.user?.username || 'user'}`
      };
    }).filter((img: any) => img.url);

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
    res.status(500).json({ success: false, error: 'Failed to fetch followers' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});