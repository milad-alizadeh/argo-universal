import type { FetchReply } from '@repo/contracts/plugins/argo-calls';
import type { PluginClock } from '../clock';
import { lower } from './plugin-rate-limit';

// What one limit had left at its last reply, and until when that holds.
type Share = { left: number; until: number };

const secondMs = 1000;

// A limit that says when it resets holds until then; one that does not is trusted for an hour, as GitHub's window is.
const windowMs = 3_600_000;

const numberOf = (value: string | undefined): number =>
  value?.trim() ? Number(value) : Number.NaN;

/*
 * How much of each rate limit a Plugin's calls may still spend, as the services' `x-ratelimit-*` headers last said:
 * one share per caller and limit, such as GitHub's `core` and `graphql`. Argo holds back reads nobody waits for while
 * a share runs low, so a Plugin never spends the last of a limit its person shares with other tools.
 */
export class RateBudget {
  private readonly shares = new Map<string, Share>();

  constructor(private readonly clock: Pick<PluginClock, 'now'>) {}

  note(gate: string, reply: FetchReply): void {
    const headers = lower(reply.headers);
    const limit = numberOf(headers['x-ratelimit-limit']);
    const remaining = numberOf(headers['x-ratelimit-remaining']);

    if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0)
      return;

    const reset = numberOf(headers['x-ratelimit-reset']);

    this.shares.set(`${gate} ${headers['x-ratelimit-resource'] ?? ''}`, {
      left: Math.max(remaining, 0) / limit,
      until: Number.isFinite(reset)
        ? reset * secondMs
        : this.clock.now() + windowMs,
    });
  }

  // The smallest share any limit still has, or nothing when no limit has said.
  left(): number | undefined {
    const now = this.clock.now();

    for (const [key, { until }] of this.shares)
      if (until <= now) this.shares.delete(key);

    const lefts = [...this.shares.values()].map(({ left }) => left);

    return lefts.length > 0 ? Math.min(...lefts) : undefined;
  }
}
