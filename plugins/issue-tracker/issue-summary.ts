import type { Issue } from './github-issues';
import { unwrap } from './github-reads';
import type { IssueDeps } from './issue-deps';
import type { IssueLink, TrackerStorage } from './tracker-storage';

// What a Session row and the Session bar say about an Issue: its state, and its title for a tooltip.
export type IssueSummary = Pick<Issue, 'title' | 'status' | 'closedAs'>;

type Source = Pick<
  IssueDeps,
  'storage' | 'trackers' | 'listProjects' | 'reads' | 'readQuery'
>;

type Target = Pick<IssueLink, 'projectId' | 'number'>;

// A Session list asks again whenever a Session changes; one Issue is not fetched twice inside this.
const freshForMs = 60_000;

export type IssueSummaries = {
  // The last summary this Plugin stored for the Issue; `null` until one has loaded.
  cached: (target: Target) => Promise<IssueSummary | null>;
  // The Issue's summary for a Slot: the stored one, refreshed in the background, or else one read now within the budget.
  answer: (target: Target) => Promise<IssueSummary | null>;
  // The Issue's state changed, so the next ask loads it again whatever its age.
  stale: (number: number) => void;
  refresh: (
    targets: readonly Target[],
    read: Source['readQuery'],
  ) => Promise<void>;
};

type Loads = {
  loadedAt: Map<string, number>;
  load: (target: Target) => Promise<void>;
};

// A summary lives in the Plugin's view cache under the Issue's number.
type CacheKey = Pick<Target, 'projectId'> & { view: string };

const keyOf = ({ projectId, number }: Target): string =>
  `${projectId}#${number}`;

const cacheKey = ({ projectId, number }: Target): CacheKey => ({
  projectId,
  view: `issue-summary-${number}`,
});

/*
 * The batched Slot call answers inside two seconds, and a Tracker call can take longer, so the Slots answer from the
 * stored summary and load a fresh one on the side. A summary that differs is stored and `changed` is called, which
 * asks the Slots again.
 */
export function createIssueSummaries(
  source: Source,
  changed: () => void,
): IssueSummaries {
  const loadedAt = new Map<string, number>();
  const cached = storedSummary(source.storage);
  const loads = { loadedAt, load: loadSummary(source, cached, changed) };
  const first = { source, cached, changed };

  return {
    cached,
    answer: (target) => answering(loads, first, target),
    stale: (number) => forget(loadedAt, number),
    refresh: refreshSummaries(first),
  };
}

const refreshSummaries =
  ({ source, cached, changed }: First): IssueSummaries['refresh'] =>
  async (targets, readQuery) => {
    const refreshed = await Promise.all(
      targets.map((target) =>
        readAndStore({ ...source, readQuery }, cached, target)
          .then(({ differs }) => differs)
          .catch(() => false),
      ),
    );

    if (refreshed.includes(true)) changed();
  };

type First = {
  source: Source;
  cached: IssueSummaries['cached'];
  changed: () => void;
};

// The stored summary, refreshed on the side, or else one read now.
async function answering(
  loads: Loads,
  first: First,
  target: Target,
): Promise<IssueSummary | null> {
  const stored = await first.cached(target);

  if (!stored) return firstSummary(first, target);

  refreshAll(loads, [target]);

  return stored;
}

const storedSummary =
  (storage: TrackerStorage): IssueSummaries['cached'] =>
  (target) =>
    storage.readCache<IssueSummary>(cacheKey(target)).catch(() => null);

type Read = { summary: IssueSummary; differs: boolean };

// Reads the summary through the Issue's Query and stores it when it differs from the stored one.
async function readAndStore(
  source: Source,
  cached: IssueSummaries['cached'],
  target: Target,
): Promise<Read> {
  const summary = await summaryOf(source, target);

  const differs =
    JSON.stringify(summary) !== JSON.stringify(await cached(target));

  if (differs) await source.storage.writeCache(cacheKey(target), summary);

  return { summary, differs };
}

function loadSummary(
  source: Source,
  cached: IssueSummaries['cached'],
  changed: () => void,
): Loads['load'] {
  return async (target) => {
    if ((await readAndStore(source, cached, target)).differs) changed();
  };
}

// How long a Slot's first answer waits for the Issue before it answers without it.
const slotBudgetMs = 1500;

const late = Symbol('late');

/*
 * The first answer for an Issue not stored yet reads it through the Query in the Slot's own call, so the Slot says
 * nothing is `changed` and the page's entry stays as fresh as it was; one that is late answers without it, then says so.
 */
async function firstSummary(
  { source, cached, changed }: First,
  target: Target,
): Promise<IssueSummary | null> {
  const loading = readAndStore(source, cached, target).catch(() => null);
  const winner = await Promise.race([loading, timeout()]);

  return winner === late ? lateSummary(loading, changed) : summaryIn(winner);
}

const summaryIn = (read: Read | null): IssueSummary | null =>
  read?.summary ?? null;

// A read that missed the budget answers without it, then says the Slots' items changed once it lands.
function lateSummary(loading: Promise<Read | null>, changed: () => void): null {
  void loading.then((read) => read && changed());

  return null;
}

const timeout = (): Promise<typeof late> =>
  new Promise((done) => {
    setTimeout(() => done(late), slotBudgetMs);
  });

function refreshAll(loads: Loads, targets: readonly Target[]): void {
  const unique = new Map(targets.map((target) => [keyOf(target), target]));

  for (const target of unique.values()) refreshOne(loads, target);
}

function refreshOne({ loadedAt, load }: Loads, target: Target): void {
  const key = keyOf(target);
  const last = loadedAt.get(key);

  if (last !== undefined && Date.now() - last < freshForMs) return;

  loadedAt.set(key, Date.now());
  void load(target).catch(() => loadedAt.delete(key));
}

function forget(loadedAt: Loads['loadedAt'], number: number): void {
  for (const key of loadedAt.keys())
    if (key.endsWith(`#${number}`)) loadedAt.delete(key);
}

async function summaryOf(
  source: Source,
  { projectId, number }: Target,
): Promise<IssueSummary> {
  // The same entry a page's Loader reads, so a Slot and a page asking for the Issue make one read.
  const settled = await source.readQuery(
    source.reads.issue({ projectId, number }),
  );

  const { title, status, closedAs } = unwrap(settled);

  return { title, status, closedAs };
}
