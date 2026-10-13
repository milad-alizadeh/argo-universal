import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { editedPaths, isEdit } from './grouping-rules';

function actionPaths(action: CommandAction): string[] {
  return action.path ? [action.path] : [];
}

export function readFileCount(actions: CommandAction[]): number {
  const reads = actions.filter((action) => action.type === 'read');
  const paths = new Set(reads.flatMap(actionPaths));
  return paths.size + reads.filter((action) => !action.path).length;
}

export function editedFileCount(toolCalls: ToolCallUpdate[]): number {
  const pathsByCall = toolCalls.filter(isEdit).map(editedPaths);
  const paths = new Set(pathsByCall.flatMap((paths) => [...paths]));
  return paths.size + pathsByCall.filter((paths) => paths.size === 0).length;
}
