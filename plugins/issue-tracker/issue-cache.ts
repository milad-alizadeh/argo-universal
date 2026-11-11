import type { Issue } from './github-issues';

// A Project's Issue by its number.
type Key = `${string}#${number}`;

type Entry = { at: number; issue: Promise<Issue> };

/*
 * How long an Issue the Plugin read is fresh: the page's own freshness window (ADR-0037), so a page opened from a
 * row, a Slot's summary and a page opened again inside it share one read.
 */
export const issueFreshMs = 60_000;

export type IssueCache = {
  // The Issue as read inside the window, or read now; a read in flight is joined, not made again.
  get: (
    target: { projectId: string; number: number },
    read: () => Promise<Issue>,
  ) => Promise<Issue>;
  // Issues a list already read in full, so opening one from its row makes no call.
  seed: (projectId: string, issues: readonly Issue[]) => void;
  // A write changed the Project's Issues, so each is read again whatever its age.
  forget: (projectId: string) => void;
};

const keyOf = (projectId: string, number: number): Key =>
  `${projectId}#${number}`;

type Held = { entries: Map<Key, Entry>; now: () => number };

// Keeps a read, and lets a failed one go so the next ask reads again.
function keep(
  { entries, now }: Held,
  key: Key,
  issue: Promise<Issue>,
): Promise<Issue> {
  entries.set(key, { at: now(), issue });
  issue.catch(() => entries.delete(key));

  return issue;
}

const freshIn = (
  { entries, now }: Held,
  key: Key,
): Promise<Issue> | undefined => {
  const held = entries.get(key);

  return held && now() - held.at < issueFreshMs ? held.issue : undefined;
};

type Target = { projectId: string; number: number };

const getFrom = (
  held: Held,
  { projectId, number }: Target,
  read: () => Promise<Issue>,
): Promise<Issue> => {
  const key = keyOf(projectId, number);

  return freshIn(held, key) ?? keep(held, key, read());
};

function seedAll(
  held: Held,
  projectId: string,
  issues: readonly Issue[],
): void {
  for (const issue of issues)
    void keep(held, keyOf(projectId, issue.number), Promise.resolve(issue));
}

function forgetAll({ entries }: Held, projectId: string): void {
  for (const key of entries.keys())
    if (key.startsWith(`${projectId}#`)) entries.delete(key);
}

/*
 * The Plugin's own memory of the Issues it read (ADR-0050: a Plugin may keep its data between calls). A Slot has no
 * Loader to read through Argo's Queries, so the named read and the Slot's summary both go through here instead,
 * and a failed read is not kept.
 */
export function createIssueCache(now: () => number = Date.now): IssueCache {
  const held: Held = { entries: new Map(), now };

  return {
    get: (target, read) => getFrom(held, target, read),
    seed: (projectId, issues) => seedAll(held, projectId, issues),
    forget: (projectId) => forgetAll(held, projectId),
  };
}
