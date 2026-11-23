import type { SessionInfo } from '@repo/contracts';
import { childTree, type TreeRow } from '@repo/kit/list-tree';
import type { SessionsListEntry } from '../sessions-list-entries';

export type SessionEntry = Extract<SessionsListEntry, { kind: 'session' }>;

type SessionIdentity = Pick<
  SessionInfo,
  'sessionId' | 'projectId' | 'startedBySessionId'
>;

export type NestedSession<Session extends SessionIdentity> = Omit<
  SessionEntry,
  'session'
> & { session: Session };

export type SessionTree = Omit<TreeRow, 'parent'> & { hasChildren: boolean };

const root: TreeRow = { depth: 0, through: [], last: true };

// Only a parent in this visible Project group can hold a row; filtered and paged orphans stay top-level.
export function nestedSessionEntries<Session extends SessionIdentity>(
  sessions: readonly Session[],
): NestedSession<Session>[] {
  const byId = new Map(sessions.map((session) => [session.sessionId, session]));
  const children = new Map<string, Session[]>();
  const roots: Session[] = [];

  for (const session of sessions)
    placeSession(session, { byId, children, roots });

  if (children.size === 0)
    return roots.map((session) => ({
      kind: 'session',
      id: session.sessionId,
      session,
    }));

  return roots.flatMap((session) => flattenSession(session, children, root));
}

type Family<Session extends SessionIdentity> = {
  byId: ReadonlyMap<string, Session>;
  children: Map<string, Session[]>;
  roots: Session[];
};

function placeSession<Session extends SessionIdentity>(
  session: Session,
  family: Family<Session>,
): void {
  const parent = listedParent(session, family.byId);

  if (!parent) {
    family.roots.push(session);

    return;
  }

  const siblings = siblingsOf(family.children, parent.sessionId);
  siblings.push(session);
  family.children.set(parent.sessionId, siblings);
}

function flattenSession<Session extends SessionIdentity>(
  session: Session,
  children: ReadonlyMap<string, Session[]>,
  tree: TreeRow,
): NestedSession<Session>[] {
  const rows = children.get(session.sessionId) ?? [];

  const entry: NestedSession<Session> = {
    kind: 'session',
    id: session.sessionId,
    session,
    tree: { ...tree, hasChildren: rows.length > 0 },
  };

  return [entry, ...flattenChildren(rows, children, tree)];
}

function flattenChildren<Session extends SessionIdentity>(
  rows: Session[],
  children: ReadonlyMap<string, Session[]>,
  tree: TreeRow,
): NestedSession<Session>[] {
  return rows.flatMap((session, index) =>
    flattenSession(
      session,
      children,
      childTree(tree, index === rows.length - 1),
    ),
  );
}

// Descendants follow their parent immediately, so one folded lane skips that whole branch without losing other roots.
export function visibleSessionEntries<
  Entry extends { id: string; kind: string; tree?: SessionTree },
>(entries: Entry[], folded: ReadonlySet<string>): Entry[] {
  let hiddenBelow = Infinity;

  return entries.filter((entry) => {
    const depth = entry.tree?.depth ?? 0;

    if (depth > hiddenBelow) return false;

    hiddenBelow = folded.has(entry.id) ? depth : Infinity;

    return true;
  });
}

function listedParent<Session extends SessionIdentity>(
  session: Session,
  byId: ReadonlyMap<string, Session>,
): Session | undefined {
  const parent = byId.get(session.startedBySessionId ?? '');

  return parent?.projectId === session.projectId ? parent : undefined;
}

function siblingsOf<Session extends SessionIdentity>(
  children: Map<string, Session[]>,
  id: string,
): Session[] {
  return children.get(id) ?? [];
}
