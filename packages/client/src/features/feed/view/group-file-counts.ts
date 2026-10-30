import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { toolCallFacts } from './feed-row-facts';

function actionPaths(action: CommandAction): string[] {
  return action.path ? [action.path] : [];
}

export function readFileCount(actions: readonly CommandAction[]): number {
  const reads = actions.filter((action) => action.type === 'read');
  const paths = new Set(reads.flatMap(actionPaths));

  return paths.size + reads.filter((action) => !action.path).length;
}

// Edits that name no file count once each.
export function editedFileCount(toolCalls: ToolCallUpdate[]): number {
  const pathsByCall = toolCalls.flatMap((call) => {
    const { editedPaths, isEdit } = toolCallFacts(call);

    return isEdit ? [editedPaths] : [];
  });

  const paths = new Set(pathsByCall.flatMap((paths) => [...paths]));

  return paths.size + pathsByCall.filter((paths) => paths.size === 0).length;
}
