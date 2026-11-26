import type { PullLink } from './pull-store';

// How long Auto-fix waits after a Session refused a Prompt before it tries that pull request again, doubling to an hour.
const firstRestMs = 300_000;

const longestRestMs = 3_600_000;

type Rest = { until: number; ms: number };

// A refused Prompt, as when the Server cannot reach the Session; the Watch rests that pull request rather than retry it.
export class PromptRefused extends Error {}

const keyOf = ({
  projectId,
  sessionId,
  repository,
  number,
}: PullLink): string =>
  JSON.stringify([projectId, sessionId, repository, number]);

/*
 * The pull requests whose Session last refused a Prompt, and until when Auto-fix leaves them: a Session that refused
 * one Prompt likely refuses the next, so asking on every Watch only fails each minute. A turn that goes through ends
 * the rest. Kept in memory: a restarted Plugin tries once more.
 */
export type PromptRests = {
  resting: (link: PullLink) => boolean;
  refused: (link: PullLink) => void;
  took: (link: PullLink) => void;
};

export function promptRests(now: () => number = Date.now): PromptRests {
  const rests = new Map<string, Rest>();

  return {
    resting: (link) => (rests.get(keyOf(link))?.until ?? 0) > now(),
    refused: (link) => {
      const before = rests.get(keyOf(link));
      const ms = before ? Math.min(before.ms * 2, longestRestMs) : firstRestMs;

      rests.set(keyOf(link), { until: now() + ms, ms });
    },
    took: (link) => void rests.delete(keyOf(link)),
  };
}
