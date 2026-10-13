import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { explorationActions, isEdit } from './grouping-rules';

const categoryTitles = {
  command: 'Ran commands',
  read: 'Read files',
  edit: 'Edited files',
  search: 'Searched',
  list: 'Listed folders',
  web: 'Searched the web',
  tool: 'Called tools',
};
type Category = keyof typeof categoryTitles;
const actionCategories: Partial<Record<CommandAction['type'], Category>> = {
  read: 'read',
  search: 'search',
  list: 'list',
};
const otherToolCategories: Partial<Record<ToolCallUpdate['kind'], Category>> = {
  fetch: 'web',
  other: 'tool',
};

function ranCommand(row: ToolCallUpdate): boolean {
  return row.kind === 'execute' && !explorationActions(row).length;
}

function toolCategory(row: ToolCallUpdate): Category | undefined {
  if (isEdit(row)) return 'edit';
  if (ranCommand(row)) return 'command';
  return otherToolCategories[row.kind];
}

export function groupTitle(toolCalls: ToolCallUpdate[]): string {
  const categories = new Set<string | undefined>([
    ...toolCalls.map(toolCategory),
    ...toolCalls
      .flatMap(explorationActions)
      .map((action) => actionCategories[action.type]),
  ]);
  return (
    Object.entries(categoryTitles)
      .filter(([category]) => categories.has(category))
      .map(([, title]) => title)
      .join(', ') || 'Worked'
  );
}
