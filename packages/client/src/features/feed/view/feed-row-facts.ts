import {
  type CommandAction,
  type Notice,
  type PermissionOutcome,
  type ToolCallUpdate,
  type TurnEnd,
} from '@repo/contracts';

type ToolCallArgo = NonNullable<ToolCallUpdate['_meta']>['argo'];

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
  // Whether the call runs a command.
  isCommand: boolean;
  // The file the call works on: the first action's path, else its first location; an unclassified action still names it.
  path: string | undefined;
  // The first location the Agent named.
  location: string | undefined;
  // How the user answered the call's Permission request, once they have.
  permissionOutcome: PermissionOutcome | undefined;
  // When the call started, in milliseconds.
  startedAt: number | undefined;
}

const editKinds = new Set<ToolCallUpdate['kind']>(['edit', 'delete', 'move']);

const firstLocation = (row: ToolCallUpdate): string | undefined =>
  row.locations?.[0]?.path;

const argoOf = (row: ToolCallUpdate): ToolCallArgo => row._meta?.argo;

const reportedActions = (row: ToolCallUpdate): readonly CommandAction[] =>
  argoOf(row)?.commandActions ?? [];

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

const decode = (row: ToolCallUpdate): ToolCallFacts => ({
  ...decodeActions(row),
  isEdit: editKinds.has(row.kind),
  editedPaths: editedPathsOf(row),
  isCommand: row.kind === 'execute',
  location: firstLocation(row),
  permissionOutcome: argoOf(row)?.permissionOutcome,
  startedAt: argoOf(row)?.startedAt,
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
