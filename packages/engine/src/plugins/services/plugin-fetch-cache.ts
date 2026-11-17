import { createHash } from 'node:crypto';
import type { FetchReply } from '@repo/contracts/plugins/argo-calls';
import type { PluginClock } from '../clock';
import type { Hop } from './plugin-fetch-response';
import { HostSlots } from './plugin-host-slots';
import { lower, rateLimited, refusal, reopensAt } from './plugin-rate-limit';

export { concurrentPerHostLimit } from './plugin-host-slots';

// One reply as `argo.fetch` hands it back.
type Send = (hop: Hop) => Promise<FetchReply>;

type Kept = { validators: Record<string, string>; reply: FetchReply };

// Enough for every pull request, Check list and page a Plugin reads at once; the oldest goes first past it.
export const keptRepliesLimit = 500;

// And at most this much body in all, 32 MiB, since one reply may be as large as a fetch reads.
export const keptBytesLimit = 33_554_432;

const okStatus = 200;

const notModifiedStatus = 304;

const credentialHeaders = ['authorization', 'cookie', 'proxy-authorization'];

const validatorHeaders = [
  ['etag', 'if-none-match'],
  ['last-modified', 'if-modified-since'],
] as const;

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

const withValidators = (hop: Hop, kept: Kept | undefined): Hop =>
  kept ? { ...hop, headers: { ...hop.headers, ...kept.validators } } : hop;

/*
 * What `argo.fetch` keeps between one Plugin's calls, so a Plugin that reads the plain way is cheap on the services it
 * reads (#2197). A GET that came back with an `etag` or `last-modified` is asked again conditionally, and a 304 answers
 * what was kept. A rate-limited answer closes that origin for that credential until it resets: until then nothing is
 * sent, and each call answers 429 with the time left.
 */
export class PluginFetchCache {
  private readonly replies = new Map<string, Kept>();
  private readonly closed = new Map<string, number>();
  private readonly slots = new HostSlots();
  private keptBytes = 0;

  constructor(private readonly clock: Pick<PluginClock, 'now'>) {}

  async fetch(hop: Hop, send: Send): Promise<FetchReply> {
    const gate = gateKey(hop);
    const until = this.closedUntil(gate);

    if (until !== undefined) return refusal(until, this.clock.now());

    const reply = await this.slots.run(hop.url.host, () =>
      this.sendWhileOpen(gate, hop, send),
    );

    if (rateLimited(reply))
      this.closed.set(gate, reopensAt(reply, this.clock.now()));

    return reply;
  }

  // A request that waited for its turn may find the origin closed by an answer that came in meanwhile.
  private async sendWhileOpen(
    gate: string,
    hop: Hop,
    send: Send,
  ): Promise<FetchReply> {
    const until = this.closedUntil(gate);

    return until === undefined
      ? this.sendKept(hop, send)
      : refusal(until, this.clock.now());
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

    return this.settle(key, kept, await send(withValidators(hop, kept)));
  }

  // A 304 answers what was kept; any other reply replaces it.
  private settle(
    key: string,
    kept: Kept | undefined,
    reply: FetchReply,
  ): FetchReply {
    if (kept && reply.status === notModifiedStatus) {
      this.keep(key, kept);

      return kept.reply;
    }

    this.remember(key, reply);

    return reply;
  }

  private remember(key: string, reply: FetchReply): void {
    if (keepable(reply))
      this.keep(key, { validators: validatorsOf(reply), reply });
    else this.forget(key);
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
