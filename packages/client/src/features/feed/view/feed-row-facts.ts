import {
  type CommandAction,
  knownCommandActions,
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
  // What an exploring call did: the actions the Agent reported, else one implied by a read or search kind.
  exploration: readonly CommandAction[];
  // The files an edit, delete or move touches; null for any other call.
  editedPaths: ReadonlySet<string> | null;
  // The file the call works on: the first reported action's path, else its first location.
  path: string | undefined;
  // The first location the Agent named.
  location: string | undefined;
  // How the user answered the call's Permission request, once they have.
  permissionOutcome: PermissionOutcome | undefined;
}

const editKinds = new Set<ToolCallUpdate['kind']>(['edit', 'delete', 'move']);

const firstLocation = (row: ToolCallUpdate): string | undefined =>
  row.locations?.[0]?.path;

function impliedExploration(row: ToolCallUpdate): CommandAction[] {
  if (row.kind !== 'read' && row.kind !== 'search') return [];

  return [{ type: row.kind, command: '', path: firstLocation(row) }];
}

function explorationOf(row: ToolCallUpdate): readonly CommandAction[] {
  const reported = knownCommandActions(row);

  return reported.length ? reported : impliedExploration(row);
}

function editedPathsOf(row: ToolCallUpdate): Set<string> | null {
  if (!editKinds.has(row.kind)) return null;

  return new Set([
    ...(row.locations ?? []).map((location) => location.path),
    ...row.content.flatMap((content) =>
      content.type === 'diff'
        ? content.changes.map((change) => change.path)
        : [],
    ),
  ]);
}

const argoOf = (row: ToolCallUpdate): ToolCallArgo => row._meta?.argo;

const reportedActions = (row: ToolCallUpdate): readonly CommandAction[] =>
  argoOf(row)?.commandActions ?? [];

const firstActionPath = (row: ToolCallUpdate): string | undefined =>
  reportedActions(row).find((action) => action.path)?.path;

const pathOf = (row: ToolCallUpdate): string | undefined =>
  firstActionPath(row) ?? firstLocation(row);

const decode = (row: ToolCallUpdate): ToolCallFacts => ({
  exploration: explorationOf(row),
  editedPaths: editedPathsOf(row),
  path: pathOf(row),
  location: firstLocation(row),
  permissionOutcome: argoOf(row)?.permissionOutcome,
});

// A row is decoded once; every later question about it reads the same facts.
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
