import type { ToolCallUpdate } from '@repo/contracts';
import type { IconName } from '@repo/kit/symbols/icon-names';
import { toolCallFacts } from '../view/feed-row-facts';

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
  toolCallFacts(row).actions[0]?.type ?? row.kind;

export function toolCallIcon(row: ToolCallUpdate): IconName {
  return categoryIcons.get(toolCallCategory(row)) ?? 'tool';
}
