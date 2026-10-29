import type { SessionInfo } from '@repo/contracts';
import { childTree, type TreeRow } from '@repo/kit/list-tree';
import type { SessionsListEntry } from '../sessions-list-entries';

export type SessionEntry = Extract<SessionsListEntry, { kind: 'session' }>;

export type SessionTree = Omit<TreeRow, 'parent'> & { hasChildren: boolean };

const root: TreeRow = { depth: 0, through: [], last: true };

// Only a parent in this visible Project group can hold a row; filtered and paged orphans stay top-level.
export function nestedSessionEntries(sessions: SessionInfo[]): SessionEntry[] {
  const byId = new Map(sessions.map((session) => [session.sessionId, session]));
  const children = new Map<string, SessionInfo[]>();
  const roots: SessionInfo[] = [];

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

type Family = {
  byId: ReadonlyMap<string, SessionInfo>;
  children: Map<string, SessionInfo[]>;
  roots: SessionInfo[];
};

function placeSession(session: SessionInfo, family: Family): void {
  const parent = listedParent(session, family.byId);

  if (!parent) {
    family.roots.push(session);

    return;
  }

  const siblings = siblingsOf(family.children, parent.sessionId);
  siblings.push(session);
  family.children.set(parent.sessionId, siblings);
}

function flattenSession(
  session: SessionInfo,
  children: ReadonlyMap<string, SessionInfo[]>,
  tree: TreeRow,
): SessionEntry[] {
  const rows = children.get(session.sessionId) ?? [];

  const entry: SessionEntry = {
    kind: 'session',
    id: session.sessionId,
    session,
    tree: { ...tree, hasChildren: rows.length > 0 },
  };

  return [entry, ...flattenChildren(rows, children, tree)];
}

function flattenChildren(
  rows: SessionInfo[],
  children: ReadonlyMap<string, SessionInfo[]>,
  tree: TreeRow,
): SessionEntry[] {
  return rows.flatMap((session, index) =>
    flattenSession(
      session,
      children,
      childTree(tree, index === rows.length - 1),
    ),
  );
}

// Descendants follow their parent immediately, so one folded lane skips that whole branch without losing other roots.
export function visibleSessionEntries(
  entries: SessionsListEntry[],
  folded: ReadonlySet<string>,
): SessionsListEntry[] {
  let hiddenBelow = Infinity;

  return entries.filter((entry) => {
    const depth = entryDepth(entry);

    if (depth > hiddenBelow) return false;

    hiddenBelow = folded.has(entry.id) ? depth : Infinity;

    return true;
  });
}

function listedParent(
  session: SessionInfo,
  byId: ReadonlyMap<string, SessionInfo>,
): SessionInfo | undefined {
  const parent = byId.get(session.startedBySessionId ?? '');

  return parentInProject(parent, session.projectId);
}

function siblingsOf(
  children: Map<string, SessionInfo[]>,
  id: string,
): SessionInfo[] {
  return children.get(id) ?? [];
}

function entryDepth(entry: SessionsListEntry): number {
  if (entry.kind !== 'session') return 0;

  return treeDepth(entry.tree);
}

function parentInProject(
  parent: SessionInfo | undefined,
  projectId: string,
): SessionInfo | undefined {
  return parent?.projectId === projectId ? parent : undefined;
}

function treeDepth(tree: SessionTree | undefined): number {
  return tree?.depth ?? 0;
}
