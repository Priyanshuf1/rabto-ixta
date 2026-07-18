/**
 * Key Manager - API Key Rotation Pool
 * User key always tried FIRST. Server keys as fallback.
 */

const SERVER_KEYS: string[] = [
  'REDACTED_API_KEY_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  '626dc32a51msh5af4ac2415b9168p1f6ec2jsnafd7f2c110b',
  'd1c2c2d744msh75922ce8cfb3825p15e4d4jsn04edfae5787'
];

const userKeys: string[] = [];

export function addUserKey(key: string): void {
  if (key && key.length > 10 && !SERVER_KEYS.includes(key) && !userKeys.includes(key)) {
    userKeys.unshift(key); // add to the FRONT so it's tried first
    console.log(`✅ User key added to pool. Total keys: ${getKeyList().length}`);
  }
}

export function getKeyList(userKey?: string): string[] {
  // Priority: provided user key → contributed user keys → server keys
  const list = [...userKeys, ...SERVER_KEYS];
  if (userKey && !list.includes(userKey)) {
    list.unshift(userKey); // provided key goes first
  }
  return list;
}

export function getPoolStatus() {
  return {
    totalKeys: userKeys.length + SERVER_KEYS.length,
    serverKeys: SERVER_KEYS.length,
    userContributed: userKeys.length
  };
}

export function isFailedResponse(data: any): boolean {
  if (!data?.message) return false;
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

/**
 * Normalize response — API returns EITHER:
 *   { user: { pk_id, ... } }    ← info endpoint
 *   { users: [{ pk_id, ... }] } ← info_username endpoint
 */
export function extractUserObject(data: any): any | null {
  if (data?.user && typeof data.user === 'object') return data.user;
  if (Array.isArray(data?.users) && data.users.length > 0) return data.users[0];
  if (data?.pk || data?.pk_id || data?.id) return data;
  return null;
}

export function getUserId(user: any): string {
  return String(user?.pk_id || user?.pk || user?.id || '');
}

export async function fetchWithRotation(
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
      console.warn(`🔑 Key ${key.substring(0, 8)}... failed: ${data.message}`);
    } catch (_) {
      console.warn(`🔑 Key ${key.substring(0, 8)}... threw error`);
    }
  }

  return {
    success: false,
    error: userKeys.length + (userKey ? 1 : 0) === 0
      ? 'Server API keys are exhausted. Please enter your own RapidAPI key.'
      : 'All API keys failed. Please check your RapidAPI subscription at rapidapi.com'
  };
}
