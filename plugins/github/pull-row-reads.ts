import { attachKept, keptOf, type Kept } from './pull-kept';
import { readLink, type ChangesSource, type LinkRead } from './pull-link-reads';
import type { PullLink } from './pull-store';

/*
 * How long a Slot waits for GitHub before it answers with what it already knows. It stays under Argo's own
 * limit for an items Slot answer: an answer past that is left out, and the Slot is not asked again until the
 * Plugin says it changed, so a cold start would empty every row and a slow read would empty the Changes.
 */
export const rowWaitMs = 1000;

export type RowReads = (sessionIds: readonly string[]) => Promise<LinkRead[]>;

type Last = Map<string, LinkRead>;

const keyOf = ({
  projectId,
  sessionId,
  repository,
  number,
}: PullLink): string =>
  JSON.stringify([projectId, sessionId, repository, number]);

// The work's answer if it settles within `ms`, else nothing; the work itself runs on.
const inTime = <Value>(
  work: Promise<Value>,
  ms: number,
): Promise<Value | void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const late = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });

  return Promise.race([work, late]).finally(() => clearTimeout(timer));
};

// What a Slot draws of one read, as text: two reads that draw the same never ask the Slot again.
type Drawn = (read: LinkRead) => string;

// What the row draws of a pull request: its title and stage, so a read that adds only Checks changes nothing there.
const rowDrawn: Drawn = ({ pull }) =>
  JSON.stringify(pull.data ? [pull.data.title, pull.data.stage] : null);

// What the Changes draw of a pull request: all that is known of it, its Checks and its automations, a failed read included.
const changeDrawn: Drawn = ({ pull, checks, fix, archive }) =>
  JSON.stringify([pull, checks, fix, archive]);

type Stored = Kept & { links: readonly PullLink[] };

// What the Plugin keeps of these Sessions: their associations, and what the automations keep beside them.
async function storedOf(
  { store }: ChangesSource,
  sessionIds: readonly string[],
): Promise<Stored> {
  const [links, kept] = await Promise.all([
    store.forSessions(sessionIds),
    keptOf(store, sessionIds),
  ]);

  return { links, ...kept };
}

// Reads every link, keeping each one GitHub answered as the last known for when a later read is slow.
const readAll = (
  source: ChangesSource,
  last: Last,
  { links, ...kept }: Stored,
): Promise<LinkRead[]> =>
  Promise.all(
    links.map(async (link) => {
      const read = await readLink(source, link);

      if (read.pull.data) last.set(keyOf(link), read);

      return attachKept(read, kept);
    }),
  );

type Asking = { changed: () => void; drawn: Drawn };

// Once the late reads land, the Slot is asked again only if it would draw them differently.
function askAgainWhenLanded(
  reads: Promise<LinkRead[]>,
  shown: readonly LinkRead[],
  { changed, drawn }: Asking,
): void {
  void reads.then((landed) => {
    const differs = landed.some(
      (read, index) => drawn(read) !== drawn(shown[index] ?? read),
    );

    if (differs) changed();
  });
}

/*
 * A Slot's pull requests: every stored association, each with GitHub's answer when it comes in time, else the
 * last one this worker read, else nothing but the association. A read that fails draws nothing new, so a
 * GitHub that stays down never asks the Slot again and again.
 */
function timedReads(source: ChangesSource, asking: Asking): RowReads {
  const last: Last = new Map();

  return async (sessionIds) => {
    const stored = await storedOf(source, sessionIds);
    const reads = readAll(source, last, stored);
    const answered = await inTime(reads, rowWaitMs);

    if (answered) return answered;

    const shown = stored.links.map((link) =>
      attachKept(last.get(keyOf(link)) ?? { link, pull: {} }, stored),
    );

    askAgainWhenLanded(reads, shown, asking);

    return shown;
  };
}

// The Session row's pull requests: one that was never read in time is drawn as just its number.
export const rowReads = (
  source: ChangesSource,
  changed: () => void,
): RowReads => timedReads(source, { changed, drawn: rowDrawn });

// The Changes' pull requests: one that was never read in time is left out until GitHub answers.
export const changeReads = (
  source: ChangesSource,
  changed: () => void,
): RowReads => timedReads(source, { changed, drawn: changeDrawn });
