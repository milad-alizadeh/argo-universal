import { readLink, type ChangesSource, type LinkRead } from './pull-link-reads';
import type { PullLink } from './pull-store';

/*
 * How long the Session row waits for GitHub before it answers with what it already knows. It stays under
 * Argo's own limit for an items Slot answer: an answer past that is left out, and the row is not asked again
 * until the Plugin says it changed, so a cold start would empty every row.
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

// What the row draws of a pull request: its title and stage, so a read that adds only Checks changes nothing there.
const drawn = ({ pull }: LinkRead): string =>
  JSON.stringify(pull.data ? [pull.data.title, pull.data.stage] : null);

// Reads every link, keeping each one GitHub answered as the last known for when a later read is slow.
const readAll = (
  source: ChangesSource,
  last: Last,
  links: readonly PullLink[],
): Promise<LinkRead[]> =>
  Promise.all(
    links.map(async (link) => {
      const read = await readLink(source, link);

      if (read.pull.data) last.set(keyOf(link), read);

      return read;
    }),
  );

// Once the late reads land, the row is asked again only if it would draw them differently.
function askAgainWhenLanded(
  reads: Promise<LinkRead[]>,
  shown: readonly LinkRead[],
  changed: () => void,
): void {
  void reads.then((landed) => {
    const differs = landed.some(
      (read, index) => drawn(read) !== drawn(shown[index] ?? read),
    );

    if (differs) changed();
  });
}

/*
 * The Session row's pull requests: every stored association, each with GitHub's answer when it comes in time,
 * else the last one this worker read, else just its number. A read that fails draws nothing new, so a GitHub
 * that stays down never asks the row again and again.
 */
export function rowReads(source: ChangesSource, changed: () => void): RowReads {
  const last: Last = new Map();

  return async (sessionIds) => {
    const links = await source.store.forSessions(sessionIds);
    const reads = readAll(source, last, links);
    const answered = await inTime(reads, rowWaitMs);

    if (answered) return answered;

    const shown = links.map(
      (link) => last.get(keyOf(link)) ?? { link, pull: {} },
    );

    askAgainWhenLanded(reads, shown, changed);

    return shown;
  };
}
