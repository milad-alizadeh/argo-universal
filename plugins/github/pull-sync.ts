import { readLink, type ChangesSource, type LinkRead } from './pull-changes';
import { keptShown } from './pull-kept';
import { PullRefreshes, type ValidatedPull } from './pull-refreshes';
import { settled } from './pull-settled';
import type { PullKey } from './pull-store';

// What one Slot answers for the pull requests it names: what is known now, with GitHub asked behind it.
type Shown = <Link extends PullKey>(
  links: readonly Link[],
) => Promise<LinkRead<Link>[]>;

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

// Whether a Slot is being asked again only because the Plugin itself just said its records changed.
type Echo = { pending: boolean };

type State = {
  source: ChangesSource;
  echoes: Echo[];
  refreshes: PullRefreshes;
  changed: () => void;
};

function sayChanged(echoes: Echo[], say: () => void): void {
  for (const echo of echoes) echo.pending = true;
  say();
}

// GitHub is asked behind a Slot's answer for every pull request that can still change.
function behind(state: State, reads: readonly Read[]): void {
  const open = reads.filter((read) => !settled(read));

  void state.refreshes
    .run(
      open.map(({ link }) => link),
      { kind: 'slot' },
    )
    .catch(leftAsItWas);
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

function stateOf(source: ChangesSource, say: () => void): State {
  const echoes: Echo[] = [];
  const changed = (): void => sayChanged(echoes, say);

  const refreshes = new PullRefreshes(
    async (link, validated) =>
      source.records.save(await readLink(source, link, validated)),
    changed,
  );

  return { source, echoes, refreshes, changed };
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
  const { store, records } = source;
  const state = stateOf(source, say);

  return {
    known: (sessionIds) => keptShown(source, sessionIds, records.of),
    changed: state.changed,
    sync: async (sessionIds, validated) =>
      state.refreshes.run(await store.forSessions(sessionIds), {
        kind: 'sync',
        validated,
      }),
    slot: () => slotOf(state),
  };
}
