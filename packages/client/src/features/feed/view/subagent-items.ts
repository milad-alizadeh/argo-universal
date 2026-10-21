import type {
  ContentBlock,
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

const argoOf = (row: SubagentUpdate): SubagentMeta => row._meta?.argo ?? {};

const actionOf = (row: SubagentUpdate): keyof typeof kinds | undefined => {
  const action = argoOf(row).action;

  return action && action in kinds ? action : undefined;
};

const resultOf = (row: SubagentUpdate): ContentBlock[] | undefined =>
  argoOf(row).result;

const promptOf = (row: SubagentUpdate): ContentBlock[] | undefined =>
  argoOf(row).prompt;

const textOf = (blocks: ContentBlock[] | undefined): string =>
  (blocks ?? [])
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');

// One line of the quoted message: the Feed row clamps to the line it sits on.
function firstLine(blocks: ContentBlock[] | undefined): string {
  const line = textOf(blocks)
    .split('\n')
    .find((value) => value.trim());

  return line?.trim() ?? '';
}

// The spawn row a later message belongs to, and the message rows those spawn rows swallowed.
export interface SpawnPrompts {
  prompts: ReadonlyMap<string, string>;
  folded: ReadonlySet<string>;
}

const isSubagentUpdate = (row: SessionUpdate): row is SubagentUpdate =>
  row.sessionUpdate === 'subagent_update';

// The Agent's first message to a child is the prompt it was spawned with, so the Started row carries it.
export function spawnPrompts(rows: readonly SessionUpdate[]): SpawnPrompts {
  const prompts = new Map<string, string>();
  const folded = new Set<string>();
  const spawned = new Map<string, string>();

  for (const row of rows.filter(isSubagentUpdate)) {
    if (actionOf(row) === 'spawn') {
      spawned.set(row.subagentSessionId, row.id);
      continue;
    }

    foldPrompt(row, spawned, { prompts, folded });
  }

  return { prompts, folded };
}

function foldPrompt(
  row: SubagentUpdate,
  spawned: Map<string, string>,
  into: { prompts: Map<string, string>; folded: Set<string> },
): void {
  const spawnId = spawned.get(row.subagentSessionId);
  const prompt = firstLine(promptOf(row));

  if (spawnId === undefined || !prompt) return;
  spawned.delete(row.subagentSessionId);
  into.prompts.set(spawnId, prompt);
  into.folded.add(row.id);
}

type Known = SessionSnapshot['subagents'][number] | undefined;

const ownTitle = (row: SubagentUpdate): string => row.title ?? 'Subagent';

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

type Action = Pick<FeedSubagent, 'kind' | 'text'>;

function rowAction(row: SubagentUpdate, prompts: SpawnPrompts): Action | null {
  const action = actionOf(row);

  if (action === 'spawn')
    return { kind: 'started', text: prompts.prompts.get(row.id) };

  if (action === 'message') return quoted('messaged', firstLine(promptOf(row)));

  return quoted('replied', firstLine(resultOf(row)));
}

// A message or a reply is nothing but its quote, so an empty one draws no row.
const quoted = (kind: FeedSubagent['kind'], text: string): Action | null =>
  text ? { kind, text } : null;

const drawnItem = (
  row: SubagentUpdate,
  action: Action,
  snapshot: SessionSnapshot,
): FeedSubagent => ({
  type: 'subagent',
  id: row.id,
  subagentSessionId: row.subagentSessionId,
  ...action,
  ...identity(row, snapshot),
});

export function subagentItem(
  row: SubagentUpdate,
  prompts: SpawnPrompts,
  snapshot: SessionSnapshot,
): FeedSubagent | null {
  if (prompts.folded.has(row.id)) return null;
  const action = rowAction(row, prompts);

  return action ? drawnItem(row, action, snapshot) : null;
}
