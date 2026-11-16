import { createHash } from 'node:crypto';
import type { FetchReply } from '@repo/contracts/plugins/argo-calls';
import type { PluginClock } from '../clock';
import type { Hop } from './plugin-fetch-response';

// One reply as `argo.fetch` hands it back.
type Send = (hop: Hop) => Promise<FetchReply>;

type Kept = { validators: Record<string, string>; reply: FetchReply };

// Enough for every pull request, Check list and page a Plugin reads at once; the oldest goes first past it.
export const keptRepliesLimit = 500;

// And at most this much body in all, since one reply may be as large as a fetch reads.
export const keptBytesLimit = 32 * 1024 * 1024;

// How long an origin stays closed when it said it was rate-limited but not until when.
export const defaultBackoffMs = 60_000;

const okStatus = 200;

const notModifiedStatus = 304;

const forbiddenStatus = 403;

const tooManyStatus = 429;

const secondMs = 1000;

const credentialHeaders = ['authorization', 'cookie', 'proxy-authorization'];

const validatorHeaders = [
  ['etag', 'if-none-match'],
  ['last-modified', 'if-modified-since'],
] as const;

const lower = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

const digest = (parts: readonly unknown[]): string =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex');

const sortedHeaders = (hop: Hop): [string, string][] =>
  Object.entries(lower(hop.headers)).sort(([a], [b]) => a.localeCompare(b));

// A reply belongs to the exact request that asked it, credential included, so one person's answer never reaches another.
const replyKey = (hop: Hop): string =>
  digest([hop.method, hop.url.href, sortedHeaders(hop)]);

const credentialOf = (hop: Hop): string[] => {
  const headers = lower(hop.headers);
  const names = hop.accountHeader
    ? [hop.accountHeader.toLowerCase()]
    : credentialHeaders;

  return names.map((name) => headers[name] ?? '');
};

// A rate limit is the service's for one caller: one origin, one credential.
const gateKey = (hop: Hop): string =>
  digest([hop.url.origin, credentialOf(hop)]);

const isGet = (hop: Hop): boolean => hop.method === 'GET';

// The Plugin asked conditionally itself, so the 304 is its own to read.
const asksConditionally = (hop: Hop): boolean => {
  const headers = lower(hop.headers);

  return validatorHeaders.some(([, ask]) => ask in headers);
};

const validatorsOf = (reply: FetchReply): Record<string, string> => {
  const headers = lower(reply.headers);

  return Object.fromEntries(
    validatorHeaders.flatMap(([given, ask]) => {
      const value = headers[given];

      return value ? [[ask, value]] : [];
    }),
  );
};

const keepable = (reply: FetchReply): boolean =>
  reply.status === okStatus &&
  !reply.truncated &&
  Object.keys(validatorsOf(reply)).length > 0;

const secondsAfter = (value: string | undefined): number | undefined => {
  const seconds = Number(value);

  return value !== undefined && value !== '' && Number.isFinite(seconds)
    ? Math.max(seconds, 0)
    : undefined;
};

const rateLimited = (reply: FetchReply): boolean => {
  const headers = lower(reply.headers);

  if (reply.status === tooManyStatus) return true;

  return (
    reply.status === forbiddenStatus &&
    ('retry-after' in headers || headers['x-ratelimit-remaining'] === '0')
  );
};

// `retry-after` first, then the epoch second the limit resets at, then a minute.
function reopensAt(reply: FetchReply, now: number): number {
  const headers = lower(reply.headers);
  const after = secondsAfter(headers['retry-after']);

  if (after !== undefined) return now + after * secondMs;

  const reset = secondsAfter(headers['x-ratelimit-reset']);

  return reset !== undefined && reset * secondMs > now
    ? reset * secondMs
    : now + defaultBackoffMs;
}

// What a closed origin answers in its place: the refusal the service would give, with the time still left.
const refusal = (until: number, now: number): FetchReply => ({
  ok: false,
  status: tooManyStatus,
  statusText: 'Too Many Requests',
  headers: { 'retry-after': String(Math.ceil((until - now) / secondMs)) },
  body: '',
  truncated: false,
});

/*
 * What `argo.fetch` keeps between one Plugin's calls, so a Plugin that reads the plain way is cheap on the services it
 * reads (#2197). A GET that came back with an `etag` or `last-modified` is asked again conditionally, and a 304 answers
 * what was kept. A rate-limited answer closes that origin for that credential until it resets: until then nothing is
 * sent, and each call answers 429 with the time left.
 */
export class PluginFetchCache {
  private readonly replies = new Map<string, Kept>();
  private readonly closed = new Map<string, number>();
  private keptBytes = 0;

  constructor(private readonly clock: Pick<PluginClock, 'now'>) {}

  async fetch(hop: Hop, send: Send): Promise<FetchReply> {
    const gate = gateKey(hop);
    const until = this.closedUntil(gate);

    if (until !== undefined) return refusal(until, this.clock.now());

    const reply = await this.sendKept(hop, send);

    if (rateLimited(reply))
      this.closed.set(gate, reopensAt(reply, this.clock.now()));

    return reply;
  }

  private closedUntil(gate: string): number | undefined {
    const until = this.closed.get(gate);

    if (until === undefined || until > this.clock.now()) return until;

    this.closed.delete(gate);

    return undefined;
  }

  private async sendKept(hop: Hop, send: Send): Promise<FetchReply> {
    if (!isGet(hop) || asksConditionally(hop)) return send(hop);

    const key = replyKey(hop);
    const kept = this.replies.get(key);
    const reply = await send(
      kept ? { ...hop, headers: { ...hop.headers, ...kept.validators } } : hop,
    );

    if (kept && reply.status === notModifiedStatus) {
      this.keep(key, kept);

      return kept.reply;
    }

    if (keepable(reply))
      this.keep(key, { validators: validatorsOf(reply), reply });
    else this.forget(key);

    return reply;
  }

  // Kept most recently used last, so the first one is the one to drop.
  private keep(key: string, kept: Kept): void {
    this.forget(key);
    this.replies.set(key, kept);
    this.keptBytes += kept.reply.body.length;

    for (const oldest of this.replies.keys()) {
      if (this.withinLimits()) break;
      this.forget(oldest);
    }
  }

  private withinLimits(): boolean {
    return (
      this.replies.size <= keptRepliesLimit && this.keptBytes <= keptBytesLimit
    );
  }

  private forget(key: string): void {
    this.keptBytes -= this.replies.get(key)?.reply.body.length ?? 0;
    this.replies.delete(key);
  }
}
