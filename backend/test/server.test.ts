import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Media Endpoint Aggregation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.clearAllMocks();
  });

  it('aggregates and deduplicates similar, followers, and following', async () => {
    // Setup mocked responses
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('info')) {
        return {
          ok: true,
          json: async () => ({ user: { username: 'test_target', follower_count: 100, following_count: 50, media_count: 10, profile_pic_url: 'info.jpg' } })
        };
      }
      if (url.includes('similar_accounts')) {
        return {
          ok: true,
          json: async () => ({ users: [{ pk: '1', username: 'sim1', profile_pic_url: 'sim1.jpg' }, { pk: '2', username: 'dup', profile_pic_url: 'dup.jpg' }] })
        };
      }
      if (url.includes('followers')) {
        return {
          ok: true,
          json: async () => ({ users: [{ pk: '3', username: 'fol1', profile_pic_url: 'fol1.jpg' }, { pk: '2', username: 'dup', profile_pic_url: 'dup.jpg' }] })
        };
      }
      if (url.includes('following')) {
        return {
          ok: true,
          json: async () => ({ users: [{ pk: '4', username: 'fwing1', profile_pic_url: 'fwing1.jpg' }] })
        };
      }
      return { ok: false };
    });

    const response = await request(app)
      .get('/api/media/123456789')
      .set('x-api-key', 'mocked_key_123'); // bypass rate limits

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Total should be sim1, dup (deduplicated), fol1, fwing1 = 4 images
    expect(response.body.images.length).toBe(4);
    const captions = response.body.images.map((img: any) => img.caption);
    expect(captions).toContain('@sim1');
    expect(captions).toContain('@dup');
    expect(captions).toContain('@fol1');
    expect(captions).toContain('@fwing1');
    
    // Ensure dup only appears once
    const dupCount = captions.filter((c: string) => c === '@dup').length;
    expect(dupCount).toBe(1);
    
    // Check userInfo
    expect(response.body.userInfo.username).toBe('test_target');
    expect(response.body.userInfo.followers).toBe(100);
  });
});
