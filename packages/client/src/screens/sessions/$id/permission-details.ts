import type { DiffChange, ToolCallUpdate } from '@repo/contracts';
import type { PermissionRequestProps } from '#features/requests';

// Argo Operations carry their own details; Agent requests use their matching Tool's input.
export function permissionDetails(
  permission: PermissionRequestProps | undefined,
  tool: ToolCallUpdate | undefined,
): Pick<PermissionRequestProps, 'input' | 'reason'> {
  if (!permission || permission.request.operation) return {};

  return toolDetails(tool);
}

function toolDetails(
  tool: ToolCallUpdate | undefined,
): Pick<PermissionRequestProps, 'input' | 'reason'> {
  if (!tool) return {};

  return { input: toolInput(tool), reason: toolReason(tool) };
}

const toolInput = (tool: ToolCallUpdate): string | undefined =>
  commandOf(tool) ?? changedFiles(tool) ?? rawInput(tool);

const commandOf = (tool: ToolCallUpdate): string | undefined =>
  tool.content.find((block) => block.type === 'terminal')?.command;

const rawInput = (tool: ToolCallUpdate): string | undefined =>
  tool.rawInput === undefined
    ? undefined
    : JSON.stringify(tool.rawInput, null, 2);

const toolReason = (tool: ToolCallUpdate): string | undefined =>
  tool._meta?.argo?.description;

// An edit has no command; what it changes is the files its diff names.
function changedFiles(tool: ToolCallUpdate): string | undefined {
  const lines = tool.content.flatMap((block) =>
    block.type === 'diff' ? block.changes.map(changeLine) : [],
  );

  return lines.length > 0 ? lines.join('\n') : undefined;
}

const changeLine = (change: DiffChange): string =>
  change.operation === 'move' && change.oldPath
    ? `${change.oldPath} -> ${change.path}`
    : `${change.operation} ${change.path}`;
