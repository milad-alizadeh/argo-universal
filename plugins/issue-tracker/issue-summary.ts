import {
  keyOf,
  readTogether,
  storedSummary,
  type Cached,
  type IssueSummary,
  type Read,
  type Source,
  type Target,
  type Together,
} from './issue-summary-reads';

export type { IssueSummary } from './issue-summary-reads';

// A Session list asks again whenever a Session changes; one Issue is not read twice inside this.
const freshForMs = 60_000;

export type IssueSummaries = {
  cached: Cached;
  // Each Issue's summary for a Slot, in the order asked: the stored one, refreshed in the background, or else one read now within the budget.
  answer: (targets: readonly Target[]) => Promise<(IssueSummary | null)[]>;
  // The Issue's state changed, so the next ask loads it again whatever its age.
  stale: (number: number) => void;
  refresh: (
    targets: readonly Target[],
    read: Source['readQuery'],
  ) => Promise<void>;
};

type Loads = {
  loadedAt: Map<string, number>;
  // Reads these Issues and answers the ones that could not be read.
  load: (targets: readonly Target[]) => Promise<Target[]>;
};

type First = { together: Together; cached: Cached; changed: () => void };

/*
 * The batched Slot call answers inside two seconds, and a Tracker call can take longer, so the Slots answer from the
 * stored summary and load fresh ones on the side, all of a Project's in one Tracker call. A summary that differs is
 * stored and `changed` is called, which asks the Slots again.
 */
export function createIssueSummaries(
  source: Source,
  changed: () => void,
): IssueSummaries {
  const loadedAt = new Map<string, number>();
  const cached = storedSummary(source.storage);
  const first = { together: readTogether(source, cached), cached, changed };
  const loads = { loadedAt, load: loadSummaries(first) };

  return {
    cached,
    answer: (targets) => answering(loads, first, targets),
    stale: (number) => forget(loadedAt, number),
    refresh: refreshSummaries(source, first),
  };
}

const differs = (reads: readonly (Read | null)[]): boolean =>
  reads.some((read) => read?.differs);

// A page's refresh reads through the page's own `read`, so the page is drawn again when an answer moves.
const refreshSummaries =
  (source: Source, { cached, changed }: First): IssueSummaries['refresh'] =>
  async (targets, readQuery) => {
    const together = readTogether({ ...source, readQuery }, cached);

    if (differs(await together(targets))) changed();
  };

type Stored = readonly (IssueSummary | null)[];

// The Issues with a stored summary, or those without one.
const whereStored = (
  targets: readonly Target[],
  stored: Stored,
  wanted: boolean,
): Target[] =>
  targets.filter((_target, index) => Boolean(stored[index]) === wanted);

// The stored summaries, refreshed on the side, and one read now for each Issue not stored yet.
async function answering(
  loads: Loads,
  first: First,
  targets: readonly Target[],
): Promise<(IssueSummary | null)[]> {
  const stored = await Promise.all(targets.map(first.cached));

  refreshDue(loads, whereStored(targets, stored, true));

  const read = await firstSummaries(first, whereStored(targets, stored, false));

  return targets.map(
    (target, index) => stored[index] ?? read.get(keyOf(target)) ?? null,
  );
}

const loadSummaries =
  ({ together, changed }: First): Loads['load'] =>
  async (targets) => {
    const reads = await together(targets);

    if (differs(reads)) changed();

    return targets.filter((_target, index) => !reads[index]);
  };

// How long a Slot's first answer waits for the Issues before it answers without them.
const slotBudgetMs = 1500;

const late = Symbol('late');

type Summaries = Map<string, IssueSummary>;

const summariesOf = (
  targets: readonly Target[],
  reads: readonly (Read | null)[],
): Summaries =>
  new Map(
    targets.flatMap((target, index) => {
      const read = reads[index];

      return read ? [[keyOf(target), read.summary] as const] : [];
    }),
  );

/*
 * The first answer for Issues not stored yet reads them in the Slot's own call, so the Slot says nothing is
 * `changed` and the page's entry stays as fresh as it was; a read that is late answers without them, then says so.
 */
async function firstSummaries(
  { together, changed }: First,
  targets: readonly Target[],
): Promise<Summaries> {
  if (targets.length === 0) return new Map();

  const loading = together(targets).catch(() => []);
  const winner = await Promise.race([loading, timeout()]);

  return winner === late
    ? lateSummaries(loading, changed)
    : summariesOf(targets, winner);
}

// A read that missed the budget answers without it, then says the Slots' items changed once it lands.
function lateSummaries(
  loading: Promise<(Read | null)[]>,
  changed: () => void,
): Summaries {
  void loading.then((reads) => reads.some(Boolean) && changed());

  return new Map();
}

const timeout = (): Promise<typeof late> =>
  new Promise((done) => {
    setTimeout(() => done(late), slotBudgetMs);
  });

const isDue = (loadedAt: Loads['loadedAt'], target: Target): boolean => {
  const last = loadedAt.get(keyOf(target));

  return last === undefined || Date.now() - last >= freshForMs;
};

// The Issues not read inside the last minute are read again, together; one that fails is due at the next ask.
function refreshDue(
  { loadedAt, load }: Loads,
  targets: readonly Target[],
): void {
  const unique = new Map(targets.map((target) => [keyOf(target), target]));
  const due = [...unique.values()].filter((target) => isDue(loadedAt, target));

  if (due.length === 0) return;

  for (const target of due) loadedAt.set(keyOf(target), Date.now());

  void load(due).then((unread) => {
    for (const target of unread) loadedAt.delete(keyOf(target));
  });
}

function forget(loadedAt: Loads['loadedAt'], number: number): void {
  for (const key of loadedAt.keys())
    if (key.endsWith(`#${number}`)) loadedAt.delete(key);
}
