import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { editedFileCount, readFileCount } from './group-file-counts';
import { explorationActions } from './grouping-rules';

const summaryOrder = [
  'command',
  'read',
  'edit',
  'search',
  'list',
  'web',
  'tool',
] as const;
type Category = (typeof summaryOrder)[number];
interface CountLabel {
  verb: string;
  noun: string;
}
const categoryLabels: Record<Category, CountLabel> = {
  command: { verb: 'Ran', noun: 'command' },
  read: { verb: 'Read', noun: 'file' },
  edit: { verb: 'Edited', noun: 'file' },
  search: { verb: 'Searched', noun: 'time' },
  list: { verb: 'Listed', noun: 'folder' },
  web: { verb: 'Searched the web', noun: 'time' },
  tool: { verb: 'Called', noun: 'tool' },
};

function ranCommand(row: ToolCallUpdate): boolean {
  return row.kind === 'execute' && !explorationActions(row).length;
}

function actionCount(
  actions: CommandAction[],
  type: CommandAction['type'],
): number {
  return actions.filter((action) => action.type === type).length;
}

function kindCount(
  toolCalls: ToolCallUpdate[],
  kind: ToolCallUpdate['kind'],
): number {
  return toolCalls.filter((row) => row.kind === kind).length;
}

function categoryCounts(toolCalls: ToolCallUpdate[]): Record<Category, number> {
  const actions = toolCalls.flatMap(explorationActions);
  return {
    command: toolCalls.filter(ranCommand).length,
    read: readFileCount(actions),
    edit: editedFileCount(toolCalls),
    search: actionCount(actions, 'search'),
    list: actionCount(actions, 'list'),
    web: kindCount(toolCalls, 'fetch'),
    tool: kindCount(toolCalls, 'other'),
  };
}

function countedTitle(label: CountLabel, count: number): string {
  if (!count) return '';
  return `${label.verb} ${count} ${pluralNoun(label.noun, count)}`;
}

function pluralNoun(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

export function groupTitle(toolCalls: ToolCallUpdate[]): string {
  const counts = categoryCounts(toolCalls);
  return (
    summaryOrder
      .map((category) =>
        countedTitle(categoryLabels[category], counts[category]),
      )
      .filter(Boolean)
      .join(', ') || 'Worked'
  );
}
