import { knownCommandActions, type ToolCallUpdate } from '@repo/contracts';
import type { IconName } from '@repo/kit/symbols/icon-names';

const categoryIcons = new Map<string, IconName>([
  ['read', 'read'],
  ['list', 'read'],
  ['search', 'web'],
  ['fetch', 'web'],
  ['execute', 'terminal'],
  ['edit', 'edit'],
  ['delete', 'edit'],
  ['move', 'edit'],
]);

const toolCallCategory = (row: ToolCallUpdate): string =>
  knownCommandActions(row)[0]?.type ?? row.kind;

export function toolCallIcon(row: ToolCallUpdate): IconName {
  return categoryIcons.get(toolCallCategory(row)) ?? 'tool';
}
