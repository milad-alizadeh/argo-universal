import { readLink, type ChangesSource, type LinkRead } from './pull-changes';
import type { CheckInfo } from './pull-checks';
import { keptShown } from './pull-kept';
import type { PullKey } from './pull-store';

// What one Slot answers for the pull requests it names: what is known now, with GitHub asked behind it.
type Shown = <Link extends PullKey>(
  links: readonly Link[],
) => Promise<LinkRead<Link>[]>;

export type Pulls = {
  // The Sessions' pull requests as they were last read: the stored record with what the automations keep, never a wait on GitHub.
  known: (sessionIds: readonly string[]) => Promise<LinkRead[]>;
  // Asks GitHub for the Sessions' pull requests and keeps what it answers; the one place a read is stored.
  sync: (sessionIds: readonly string[]) => Promise<void>;
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

const ended = ({ pull }: Read): boolean =>
  pull.data?.stage === 'merged' || pull.data?.stage === 'closed';

// A merged or closed pull request whose Checks have all reported cannot change, so a Slot never asks GitHub for it again;
// a refresh the person asks for still reads it, which is how a reopened one is found.
const settled = (read: Read): boolean =>
  ended(read) && !read.pull.failure && !running(read);

// Whether a Slot is being asked again only because the Plugin itself just said its records changed.
type Echo = { pending: boolean };

type State = { source: ChangesSource; say: () => void; echoes: Echo[] };

function sayChanged({ echoes, say }: State): void {
  for (const echo of echoes) echo.pending = true;
  say();
}

const saveRead = async (
  source: ChangesSource,
  link: PullKey,
): Promise<boolean> => source.records.save(await readLink(source, link));

async function syncLinks(
  state: State,
  links: readonly PullKey[],
): Promise<void> {
  const saved = await Promise.all(
    links.map((link) => saveRead(state.source, link)),
  );

  if (saved.includes(true)) sayChanged(state);
}

// GitHub is asked behind a Slot's answer for every pull request that can still change.
function behind(state: State, reads: readonly Read[]): void {
  const open = reads.filter((read) => !settled(read));

  void syncLinks(
    state,
    open.map(({ link }) => link),
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
  const state: State = { source, say, echoes: [] };
  const { store, records } = source;

  return {
    known: (sessionIds) => keptShown(source, sessionIds, records.of),
    changed: () => sayChanged(state),
    sync: async (sessionIds) =>
      syncLinks(state, await store.forSessions(sessionIds)),
    slot: () => slotOf(state),
  };
}
