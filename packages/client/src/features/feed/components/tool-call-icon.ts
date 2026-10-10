import { knownCommandActions, type ToolCallUpdate } from '@repo/contracts';
import type { IconName } from '#lib/generic/symbols/icon-names';

export function toolCallIcon(row: ToolCallUpdate): IconName {
  const category = knownCommandActions(row)[0]?.type ?? row.kind;
  switch (category) {
    case 'read':
    case 'list':
      return 'read';
    case 'search':
    case 'fetch':
      return 'web';
    case 'execute':
      return 'terminal';
    case 'edit':
    case 'delete':
    case 'move':
      return 'edit';
    default:
      return 'tool';
  }
}
