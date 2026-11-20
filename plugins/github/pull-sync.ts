import { readLink, type ChangesSource, type LinkRead } from './pull-changes';
import type { CheckInfo } from './pull-checks';
import type { PullInfo } from './pull-info';
import { keptShown } from './pull-kept';
import { pullRecordKey } from './pull-records';
import type { PullKey } from './pull-store';

// What one Slot answers for the pull requests it names: what is known now, with GitHub asked behind it.
type Shown = <Link extends PullKey>(
  links: readonly Link[],
) => Promise<LinkRead<Link>[]>;

type ValidatedPull = { link: PullKey; data: PullInfo };

export type Pulls = {
  // The Sessions' pull requests as they were last read: the stored record with what the automations keep, never a wait on GitHub.
  known: (sessionIds: readonly string[]) => Promise<LinkRead[]>;
  // Asks GitHub for the Sessions' pull requests and keeps what it answers; the one place a read is stored.
  sync: (
    sessionIds: readonly string[],
    validated?: ValidatedPull,
  ) => Promise<void>;
  // Says what the Slots show changed, after a sync that already read all there is to read.
  changed: () => void;
  // One Slot's answers. A Slot answers at once and is asked again when a sync changed what is kept.
  slot: () => Shown;
};

// A sync that could not run leaves the record as it was; the next ask runs it again.
const leftAsItWas = (): void => {};

type Read = LinkRead<PullKey>;

const isRunning = ({ state }: CheckInfo): boolean => state === 'running';

const running = ({ checks }: Read): boolean =>
  (checks?.data ?? []).some(isRunning);

const endedStages = new Set<string | undefined>(['merged', 'closed']);

const ended = ({ pull }: Read): boolean => endedStages.has(pull.data?.stage);

/*
 * A merged or closed pull request whose Checks have all reported cannot change, so a Slot never asks GitHub for it
 * again. A closed one that GitHub reopens is read again only by a sync that is not a Slot's ask.
 */
const settled = (read: Read): boolean =>
  ended(read) && !read.pull.failure && !running(read);

// Whether a Slot is being asked again only because the Plugin itself just said its records changed.
type Echo = { pending: boolean };

type State = {
  source: ChangesSource;
  say: () => void;
  echoes: Echo[];
  inFlight: Map<string, Promise<boolean>>;
};

function sayChanged({ echoes, say }: State): void {
  for (const echo of echoes) echo.pending = true;
  say();
}

type Refresh = { kind: 'slot' | 'sync'; validated?: ValidatedPull };

async function saveRead(
  source: ChangesSource,
  link: PullKey,
  { validated }: Refresh,
): Promise<boolean> {
  const pull =
    validated && pullRecordKey(validated.link) === pullRecordKey(link)
      ? validated.data
      : undefined;

  return source.records.save(await readLink(source, link, pull));
}

// A Slot can receive a kept Query answer while it refreshes. A Watch or Operation waits for the current answer.
function syncLink(
  state: State,
  link: PullKey,
  refresh: Refresh,
): Promise<boolean> {
  const key = `${refresh.kind}:${pullRecordKey(link)}`;
  const pending = state.inFlight.get(key);

  if (pending) return pending.then(() => false);

  const saved = saveRead(state.source, link, refresh);
  state.inFlight.set(key, saved);

  return saved.finally(() => {
    state.inFlight.delete(key);
  });
}

async function syncLinks(
  state: State,
  links: readonly PullKey[],
  refresh: Refresh,
): Promise<void> {
  const saved = await Promise.all(
    links.map((link) => syncLink(state, link, refresh)),
  );

  if (saved.includes(true)) sayChanged(state);
}

// GitHub is asked behind a Slot's answer for every pull request that can still change.
function behind(state: State, reads: readonly Read[]): void {
  const open = reads.filter((read) => !settled(read));

  void syncLinks(
    state,
    open.map(({ link }) => link),
    { kind: 'slot' },
  ).catch(leftAsItWas);
}

async function shownBy<Link extends PullKey>(
  state: State,
  echo: Echo,
  links: readonly Link[],
): Promise<LinkRead<Link>[]> {
  const reads = await state.source.records.of(links);

  if (echo.pending) echo.pending = false;
  else behind(state, reads);

  return reads;
}

function slotOf(state: State): Shown {
  const echo: Echo = { pending: false };

  state.echoes.push(echo);

  return (links) => shownBy(state, echo, links);
}

/*
 * Every surface's pull requests (ADR-0052). GitHub is read in one place, `sync`, which keeps each answer in the
 * Plugin's storage and says so only when what is kept changed; the Session row, the Changes, a link's mark and the
 * Operations all read that one record, so they never disagree and none of them waits on GitHub.
 *
 * Saying so asks every Slot again and makes every named read due. That ask is answered from the record alone: the
 * sync that caused it has just read GitHub, so reading it again would only find the same.
 */
export function createPulls(source: ChangesSource, say: () => void): Pulls {
  const state: State = { source, say, echoes: [], inFlight: new Map() };
  const { store, records } = source;

  return {
    known: (sessionIds) => keptShown(source, sessionIds, records.of),
    changed: () => sayChanged(state),
    sync: async (sessionIds, validated) =>
      syncLinks(state, await store.forSessions(sessionIds), {
        kind: 'sync',
        validated,
      }),
    slot: () => slotOf(state),
  };
}
