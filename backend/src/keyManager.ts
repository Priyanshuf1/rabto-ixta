/**
 * Key Manager - API Key Rotation Pool
 * Manages server-side keys + user-contributed keys with smart rotation.
 * If a key fails (quota/not-subscribed), it automatically tries the next one.
 */

// Server-side keys (3 keys from the app owner)
const SERVER_KEYS: string[] = [
  '343aa853a7msh1bcf722e1b64529p137288jsnf27fe0e15b25',
  '626dc32a51msh5af4ac2415b9168p1f6ec2jsnafd7f2c110b',
  'd1c2c2d744msh75922ce8cfb3825p15e4d4jsn04edfae5787'
];

// User-contributed keys (added at runtime)
const userKeys: Set<string> = new Set();

let currentKeyIndex = 0;

export function addUserKey(key: string): void {
  if (key && key.length > 10 && !SERVER_KEYS.includes(key)) {
    userKeys.add(key);
    console.log(`✅ New user key added to pool. Pool size: ${getAllKeys().length}`);
  }
}

export function getAllKeys(): string[] {
  return [...SERVER_KEYS, ...Array.from(userKeys)];
}

export function getPoolStatus() {
  return {
    totalKeys: getAllKeys().length,
    serverKeys: SERVER_KEYS.length,
    userContributed: userKeys.size
  };
}

/**
 * Make a RapidAPI request, automatically rotating through the key pool
 * if keys fail due to quota or subscription issues.
 */
export async function fetchWithRotation(
  urlBuilder: (key: string) => string,
  userProvidedKey?: string
): Promise<{ data: any; keyUsed: string; success: boolean; error?: string }> {
  
  // Build key list: user's key first (priority), then pool
  const keys = userProvidedKey
    ? [userProvidedKey, ...getAllKeys()]
    : getAllKeys();

  const uniqueKeys = [...new Set(keys)]; // deduplicate

  for (let i = 0; i < uniqueKeys.length; i++) {
    const key = uniqueKeys[(currentKeyIndex + i) % uniqueKeys.length];
    
    try {
      const res = await fetch(urlBuilder(key), {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'flashapi1.p.rapidapi.com'
        }
      });
      
      const data = await res.json();
      
      const isFailed = data.message && (
        data.message.toLowerCase().includes('not subscribed') ||
        data.message.toLowerCase().includes('quota') ||
        data.message.toLowerCase().includes('exceeded') ||
        data.message.toLowerCase().includes('invalid') ||
        data.message.toLowerCase().includes('unauthorized')
      );
      
      if (!isFailed) {
        // Successful! Advance rotation index
        currentKeyIndex = (currentKeyIndex + i + 1) % uniqueKeys.length;
        return { data, keyUsed: key, success: true };
      }
      
      console.warn(`🔑 Key ${key.substring(0, 8)}... failed: ${data.message}. Trying next...`);
    } catch (err) {
      console.warn(`🔑 Key ${key.substring(0, 8)}... threw error. Trying next...`);
    }
  }

  return {
    data: null,
    keyUsed: '',
    success: false,
    error: 'All API keys in the pool are exhausted or invalid. Please contribute your RapidAPI key.'
  };
}
