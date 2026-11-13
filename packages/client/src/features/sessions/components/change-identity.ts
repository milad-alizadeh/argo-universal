import type { SessionPullRequest } from './session-pull-request';

/*
 * What tells one Change from another, so a selection can follow a Change rather than its place in a list. A supplied
 * identity is repository plus number (ADR-0052), so equal numbers in two repositories never meet; without one, as in
 * stories, the number stands in.
 */
export const changeKey = (change: SessionPullRequest): string =>
  change.id ?? String(change.number);

// The Change a key names, or nothing when it is no longer among them: never another Change in its place.
export const findChange = (
  changes: readonly SessionPullRequest[],
  key: string | null,
): SessionPullRequest | undefined =>
  key === null
    ? undefined
    : changes.find((change) => changeKey(change) === key);

// How a row says which Change it is: its repository too, where it has one, since two repositories share numbers.
export const changeName = (change: SessionPullRequest): string =>
  change.repository
    ? `${change.repository}#${change.number}`
    : `#${change.number}`;
