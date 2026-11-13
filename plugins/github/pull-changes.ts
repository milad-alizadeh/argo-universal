import type { Argo } from '@argo/plugin-kit';
import { changeOf, type ChangeItem } from './pull-change';
import type { PullInfo } from './pull-info';
import { unwrap, type PullReads } from './pull-reads';
import type { PullLink, PullStore } from './pull-store';

export type ChangesSource = {
  store: PullStore;
  reads: PullReads;
  readQuery: Argo['queries']['read'];
};

// One association read from GitHub, or why it could not be.
export type LinkRead = { link: PullLink; read: PullInfo | Error };

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

async function readLink(
  { reads, readQuery }: ChangesSource,
  link: PullLink,
): Promise<LinkRead> {
  try {
    const settled = await readQuery(reads.pull(link), {
      projectId: link.projectId,
    });

    return { link, read: unwrap(settled) };
  } catch (cause) {
    return { link, read: asError(cause) };
  }
}

// Every association of these Sessions with its pull request, read through the named Query that Slots and Operations share.
export async function readLinks(
  source: ChangesSource,
  sessionIds: readonly string[],
): Promise<LinkRead[]> {
  const links = await source.store.forSessions(sessionIds);

  return Promise.all(links.map((link) => readLink(source, link)));
}

const changeRead = ({ link, read }: LinkRead): ChangeRead => {
  if (read instanceof Error) throw read;

  return { sessionId: link.sessionId, change: changeOf(read) };
};

type ChangeRead = { sessionId: string; change: ChangeItem };

const changesOfGroup = (group: ChangeRead[] | undefined): ChangeItem[] =>
  (group ?? []).map(({ change }) => change);

// A failed read is thrown, never answered as no Changes: Argo then keeps the Plugin's contribution out and says why.
export const changesBySession = (
  reads: readonly LinkRead[],
): Readonly<Record<string, ChangeItem[]>> =>
  Object.fromEntries(
    Object.entries(
      Object.groupBy(reads.map(changeRead), ({ sessionId }) => sessionId),
    ).map(([sessionId, group]) => [sessionId, changesOfGroup(group)]),
  );
