import type {
  SessionSnapshot,
  SessionUpdate,
  SubagentUpdate,
} from '@repo/contracts';
import type { FeedSubagent } from './feed-view';

// Paper draws a row per action, never a state change: the Subagents list is where status lives.
const kinds = {
  spawn: 'started',
  message: 'messaged',
} as const satisfies Record<string, FeedSubagent['kind']>;

// Argo's own fields on the row (ADR-0006), absent until the Agent reports an action.
type SubagentMeta = NonNullable<NonNullable<SubagentUpdate['_meta']>['argo']>;

const extensionOf = (row: SubagentUpdate): SubagentMeta =>
  row._meta?.argo ?? {};

const actionOf = (row: SubagentUpdate): keyof typeof kinds | undefined => {
  const action = extensionOf(row).action;

  return action && action in kinds ? action : undefined;
};

const isSubagentUpdate = (row: SessionUpdate): row is SubagentUpdate =>
  row.sessionUpdate === 'subagent_update';

/*
 * The Agent's first message to a child is the prompt it was spawned with, so the Started row stands for it and the
 * message draws no row of its own.
 */
export function foldedPrompts(
  rows: readonly SessionUpdate[],
): ReadonlySet<string> {
  const folded = new Set<string>();
  const spawned = new Set<string>();

  for (const row of rows.filter(isSubagentUpdate))
    foldPrompt(row, spawned, folded);

  return folded;
}

// The first message to a spawned child is its prompt, which the Started row stands for.
const isSpawnPrompt = (row: SubagentUpdate, spawned: Set<string>): boolean =>
  actionOf(row) === 'message' && spawned.delete(row.subagentSessionId);

// A spawn waits for its prompt; the child's next message is that prompt, and folds.
function foldPrompt(
  row: SubagentUpdate,
  spawned: Set<string>,
  folded: Set<string>,
): void {
  if (actionOf(row) === 'spawn') spawned.add(row.subagentSessionId);
  else if (isSpawnPrompt(row, spawned)) folded.add(row.id);
}

type Known = SessionSnapshot['subagents'][number] | undefined;

const ownTitle = (row: SubagentUpdate): string => row.title ?? 'Agent';

// The Subagents list names the child; the row's own title stands in until the list knows it.
const titleOf = (known: Known, row: SubagentUpdate): string =>
  known?.title ?? ownTitle(row);

// The Agent's name for the child and its role, which tint and name the row's avatar.
function identity(
  row: SubagentUpdate,
  snapshot: SessionSnapshot,
): Pick<FeedSubagent, 'title' | 'role'> {
  const known = snapshot.subagents.find(
    (subagent) => subagent.sessionId === row.subagentSessionId,
  );

  return { title: titleOf(known, row), role: known?.role ?? null };
}

/*
 * A row carrying a `result` is the child's reply, even an empty one; a row with neither an action nor a result is a
 * state change and draws nothing. The row says only that it happened: the words are in the child's own Feed.
 */
function rowKind(row: SubagentUpdate): FeedSubagent['kind'] | null {
  const action = actionOf(row);

  if (action) return kinds[action];

  return extensionOf(row).result ? 'replied' : null;
}

export function subagentItem(
  row: SubagentUpdate,
  folded: ReadonlySet<string>,
  snapshot: SessionSnapshot,
): FeedSubagent | null {
  const kind = rowKind(row);

  if (!kind || folded.has(row.id)) return null;

  return {
    type: 'subagent',
    id: row.id,
    subagentSessionId: row.subagentSessionId,
    kind,
    ...identity(row, snapshot),
  };
}
