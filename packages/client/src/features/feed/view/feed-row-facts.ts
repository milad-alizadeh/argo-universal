import {
  type CommandAction,
  type Notice,
  type PermissionOutcome,
  type ToolCallUpdate,
  type ToolCallContent,
  type ToolCallTerminal,
  type TurnEnd,
} from '@repo/contracts';
import { z } from 'zod';

type ToolMetadata = NonNullable<ToolCallUpdate['_meta']>['argo'];

/*
 * What the Feed view needs to know about a Tool call, decoded from the row's wire details once.
 * The rest of the view reads these facts, never `_meta.argo` or a `kind` string.
 */
export interface ToolCallFacts {
  // The command actions the Agent reported; none when it reported none or any it could not classify.
  actions: readonly CommandAction[];
  // What an exploring call did: the reported actions, else one implied by a read or search kind.
  exploration: readonly CommandAction[];
  // Whether the call explores rather than changes anything.
  explores: boolean;
  // Whether the call edits, deletes or moves files.
  isEdit: boolean;
  // The files an edit touches; empty for any other call, and for an edit that names none.
  editedPaths: ReadonlySet<string>;
  // The Agent’s description, when supplied separately from the title.
  description: string | undefined;
  // Whether the call runs a command.
  isCommand: boolean;
  // The available shell command, from terminal content or raw input.
  command: string | undefined;
  // Whether the call failed, including a non-zero terminal exit.
  failed: boolean;
  // The file the call works on: the first action's path, else its first location; an unclassified action still names it.
  path: string | undefined;
  // The first location the Agent named.
  location: string | undefined;
  // How the user answered the call's Permission request, once they have.
  permissionOutcome: PermissionOutcome | undefined;
  // When the call started, in milliseconds.
  startedAt: number | undefined;
  // What the Agent called the command in its own words: its description, else a title that is not the command line or an adapter placeholder.
  agentTitle: string | undefined;
}

const adapterPlaceholderTitle = 'Terminal';

const editKinds = new Set<ToolCallUpdate['kind']>(['edit', 'delete', 'move']);

const firstLocation = (row: ToolCallUpdate): string | undefined =>
  row.locations?.[0]?.path;

const extensionOf = (row: ToolCallUpdate): ToolMetadata => row._meta?.argo;

const reportedActions = (row: ToolCallUpdate): readonly CommandAction[] =>
  extensionOf(row)?.commandActions ?? [];

const classified = (
  reported: readonly CommandAction[],
): readonly CommandAction[] =>
  reported.some((action) => action.type === 'unknown') ? [] : reported;

function impliedExploration(row: ToolCallUpdate): CommandAction[] {
  if (row.kind !== 'read' && row.kind !== 'search') return [];

  return [{ type: row.kind, command: '', path: firstLocation(row) }];
}

const explorationOf = (
  row: ToolCallUpdate,
  actions: readonly CommandAction[],
): readonly CommandAction[] =>
  actions.length ? actions : impliedExploration(row);

function editedPathsOf(row: ToolCallUpdate): Set<string> {
  if (!editKinds.has(row.kind)) return new Set();

  return new Set([
    ...(row.locations ?? []).map((location) => location.path),
    ...row.content.flatMap((content) =>
      content.type === 'diff'
        ? content.changes.map((change) => change.path)
        : [],
    ),
  ]);
}

const pathOf = (
  row: ToolCallUpdate,
  reported: readonly CommandAction[],
): string | undefined =>
  reported.find((action) => action.path)?.path ?? firstLocation(row);

function decodeActions(
  row: ToolCallUpdate,
): Pick<ToolCallFacts, 'actions' | 'exploration' | 'explores' | 'path'> {
  const reported = reportedActions(row);
  const actions = classified(reported);
  const exploration = explorationOf(row, actions);

  return {
    actions,
    exploration,
    explores: exploration.length > 0,
    path: pathOf(row, reported),
  };
}

const descriptionOf = (row: ToolCallUpdate): string | undefined =>
  extensionOf(row)?.description?.trim();

const isPlaceholder = (row: ToolCallUpdate): boolean =>
  [terminalCommandOf(row), adapterPlaceholderTitle, ''].includes(row.title);

const CommandInput = z.object({ command: z.string() });

const rawCommandOf = (row: ToolCallUpdate): string | undefined =>
  CommandInput.safeParse(row.rawInput).data?.command;

const terminalCommandOf = (row: ToolCallUpdate): string | undefined =>
  row.content.find((block) => block.type === 'terminal')?.command;

const commandOf = (row: ToolCallUpdate): string | undefined =>
  terminalCommandOf(row) || rawCommandOf(row);

const titleOf = (row: ToolCallUpdate): string | undefined =>
  isPlaceholder(row) ? undefined : row.title;

const agentTitleOf = (row: ToolCallUpdate): string | undefined =>
  extensionOf(row)?.description || titleOf(row);

const nonzeroExit = (status: ToolCallTerminal['exitStatus']): boolean =>
  (status?.exitCode ?? 0) !== 0;

const terminalFailed = (block: ToolCallContent): boolean =>
  block.type === 'terminal' && nonzeroExit(block.exitStatus);

const commandFacts = (
  row: ToolCallUpdate,
): Pick<ToolCallFacts, 'isCommand' | 'command' | 'failed'> => ({
  isCommand: row.kind === 'execute',
  command: row.kind === 'execute' ? commandOf(row) : undefined,
  failed: row.status === 'failed' || row.content.some(terminalFailed),
});

const decode = (row: ToolCallUpdate): ToolCallFacts => ({
  ...decodeActions(row),
  ...commandFacts(row),
  isEdit: editKinds.has(row.kind),
  editedPaths: editedPathsOf(row),
  description: descriptionOf(row),
  location: firstLocation(row),
  permissionOutcome: extensionOf(row)?.permissionOutcome,
  startedAt: extensionOf(row)?.startedAt,
  agentTitle: agentTitleOf(row),
});

/*
 * A row is decoded once; every later question about it reads the same facts. The cache holds because a wire row is
 * an immutable revision: a change arrives as a new object, and nothing in the view edits a row.
 */
const decoded = new WeakMap<ToolCallUpdate, ToolCallFacts>();

export function toolCallFacts(row: ToolCallUpdate): ToolCallFacts {
  const known = decoded.get(row);

  if (known) return known;
  const facts = decode(row);

  decoded.set(row, facts);

  return facts;
}

// How the Turn ended, when this Notice is the Turn's end marker.
export const noticeTurnEnd = (row: Notice): TurnEnd | undefined =>
  row._meta?.argo?.turnEnd;
