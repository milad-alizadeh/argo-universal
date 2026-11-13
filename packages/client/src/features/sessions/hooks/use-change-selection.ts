import { useState } from 'react';
import type {
  DiscoveryResult,
  UnreadChange,
} from '../components/change-discovery';
import { changeKey, findChange } from '../components/change-identity';
import type { SessionPullRequest } from '../components/session-pull-request';

/*
 * Which of the Session's Changes its Inspector shows in full. The selection is a Change's identity (repository plus
 * number, ADR-0052), never its place in the list, so a refresh or a reorder cannot move it to another Change, and a
 * Change that is detached while selected leaves the Inspector on its list rather than on a neighbour.
 */
export interface ChangeSelection {
  // The Change in full; none while the list shows.
  selected: SessionPullRequest | undefined;
  select: (change: SessionPullRequest) => void;
  // Back to the list.
  back: () => void;
}

// What a person can do to the Session's Changes, beside reading them; the page supplies it where the Session's Plugins allow it.
export interface ChangeActions {
  /*
   * A PR by `owner/name#12`, its URL or, in the Project's own repository, its number. Answers whether it was attached;
   * a refusal is toasted, not thrown.
   */
  attach: (reference: string) => Promise<boolean>;
  // Only this Change's association; the others, and the PR on GitHub, stay.
  detach: (change: SessionPullRequest) => Promise<boolean>;
  // Looks for the PRs of the Session's branch and attaches them; answers what it found, nothing if the Operation was refused.
  discover: () => Promise<DiscoveryResult | undefined>;
  // Reads every attached PR again, now; the retry after a failed read or signing in again.
  refresh: () => Promise<void>;
  // Attached PRs that were never read, so the list does not hold them; a failed first read is not an empty list.
  unread: readonly UnreadChange[];
}

export function useChangeSelection(
  changes: readonly SessionPullRequest[],
): ChangeSelection {
  const [key, setKey] = useState<string | null>(null);
  const selected = findChange(changes, key);

  // A key whose Change has gone is dropped at once, so it cannot select that Change again if it returns.
  if (key !== null && !selected) setKey(null);

  return {
    selected,
    select: (change) => setKey(changeKey(change)),
    back: () => setKey(null),
  };
}
