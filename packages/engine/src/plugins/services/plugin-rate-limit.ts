import type { FetchReply } from '@repo/contracts/plugins/argo-calls';

export const lower = (
  headers: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

// How long an origin stays closed when it said it was rate-limited but not until when.
export const defaultBackoffMs = 60_000;

const forbiddenStatus = 403;

const tooManyStatus = 429;

const secondMs = 1000;

const numberOf = (value: string | undefined): number =>
  value?.trim() ? Number(value) : Number.NaN;

const secondsAfter = (value: string | undefined): number | undefined => {
  const seconds = numberOf(value);

  return Number.isFinite(seconds) ? Math.max(seconds, 0) : undefined;
};

const saysSpent = (headers: Record<string, string>): boolean =>
  'retry-after' in headers || headers['x-ratelimit-remaining'] === '0';

export const rateLimited = (reply: FetchReply): boolean =>
  reply.status === tooManyStatus ||
  (reply.status === forbiddenStatus && saysSpent(lower(reply.headers)));

// The epoch second the limit resets at, while it is still ahead.
const resetAt = (
  headers: Record<string, string>,
  now: number,
): number | undefined => {
  const reset = secondsAfter(headers['x-ratelimit-reset']);

  return reset !== undefined && reset * secondMs > now
    ? reset * secondMs
    : undefined;
};

// `retry-after` first, then the reset, then a minute.
export function reopensAt(reply: FetchReply, now: number): number {
  const headers = lower(reply.headers);
  const after = secondsAfter(headers['retry-after']);

  if (after !== undefined) return now + after * secondMs;

  return resetAt(headers, now) ?? now + defaultBackoffMs;
}

// What a closed origin answers in its place: the refusal the service would give, with the time still left.
export const refusal = (until: number, now: number): FetchReply => ({
  ok: false,
  status: tooManyStatus,
  statusText: 'Too Many Requests',
  headers: { 'retry-after': String(Math.ceil((until - now) / secondMs)) },
  body: '',
  truncated: false,
});
