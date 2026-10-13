import type { ToolCallUpdate } from '@repo/contracts';
import { startedAt } from '../recorded-tool-calls.mocks';
import { commandActions, firstLocationPath } from '../tool-call-meta';
import { runningRead, toolCallGroupMocks } from '../tool-call.mocks';

export const commandAndFileSummary = 'Ran 1 command, Read 1 file';
export const readFileTitle = 'Read /project/hello.txt';
export const commandTitle = 'Show hello.txt and short git status';
export const dark = { globals: { mode: 'dark' } };

export const runningReadNow = startedAt(runningRead) + 23000;

const terminalCommand = (row: ToolCallUpdate): string | undefined =>
  row.content.find((content) => content.type === 'terminal')?.command;

// A running command titled with its own command line shows the generic title.
const expectedTitle = (row: ToolCallUpdate): string =>
  row.title === terminalCommand(row) ? 'Running command' : row.title;

const readPath = (row: ToolCallUpdate): string | undefined =>
  commandActions(row).find((action) => action.type === 'read')?.path ??
  firstLocationPath(row);

export function parallelCase(agentIndex: number): {
  recorded: (typeof toolCallGroupMocks)[number];
  expectedTitle: string;
  read: string;
} {
  const recorded = toolCallGroupMocks[agentIndex];
  if (!recorded)
    throw new Error(
      'Recorded catalog needs parallel Tool calls for both Agents',
    );
  const read = readPath(recorded.later);
  if (!read) throw new Error('Recorded catalog needs a completed read path');
  return { recorded, expectedTitle: expectedTitle(recorded.earlier), read };
}
