import type { CommandAction, ToolCallUpdate } from '@repo/contracts';

type ArgoMeta = NonNullable<ToolCallUpdate['_meta']>['argo'];

export const argoMeta = (row: ToolCallUpdate): ArgoMeta => row._meta?.argo;

const commandActions = (row: ToolCallUpdate): readonly CommandAction[] =>
  argoMeta(row)?.commandActions ?? [];

export const firstLocationPath = (row: ToolCallUpdate): string | undefined =>
  row.locations?.[0]?.path;

// The file a Tool call works on: the first command action's path, else its first location.
export const toolCallPath = (row: ToolCallUpdate): string | undefined =>
  commandActions(row).find((action) => action.path)?.path ??
  firstLocationPath(row);
