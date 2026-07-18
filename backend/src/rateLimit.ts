/**
 * Rate Limiter — 1 free use per IP per day
 * After the free use is spent, the user must contribute their API key.
 */

interface UsageRecord {
  date: string;   // "2024-01-15"
  count: number;
}

const usage = new Map<string, UsageRecord>();

const FREE_USES_PER_DAY = 1;

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export function checkFreeUse(ip: string): { allowed: boolean; remaining: number; total: number } {
  const today = getToday();
  const record = usage.get(ip);

  if (!record || record.date !== today) {
    // New day or new user — reset
    usage.set(ip, { date: today, count: 0 });
    return { allowed: true, remaining: FREE_USES_PER_DAY, total: FREE_USES_PER_DAY };
  }

  const remaining = Math.max(0, FREE_USES_PER_DAY - record.count);
  return {
    allowed: remaining > 0,
    remaining,
    total: FREE_USES_PER_DAY
  };
}

export function consumeFreeUse(ip: string): void {
  const today = getToday();
  const record = usage.get(ip);

  if (!record || record.date !== today) {
    usage.set(ip, { date: today, count: 1 });
  } else {
    record.count++;
  }
}

export function getRemainingUses(ip: string): number {
  const today = getToday();
  const record = usage.get(ip);
  if (!record || record.date !== today) return FREE_USES_PER_DAY;
  return Math.max(0, FREE_USES_PER_DAY - record.count);
}
