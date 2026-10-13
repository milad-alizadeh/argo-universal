import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { startedAt } from '../recorded-tool-calls.mocks';
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

// Read straight from the recorded row, independently of the rows' own path lookup.
const recordedActions = (row: ToolCallUpdate): CommandAction[] | undefined =>
  row._meta?.argo?.commandActions;

const readActionPath = (
  actions: CommandAction[] | undefined,
): string | undefined =>
  actions?.find((action) => action.type === 'read')?.path;

const recordedLocation = (row: ToolCallUpdate): string | undefined =>
  row.locations?.[0]?.path;

const readPath = (row: ToolCallUpdate): string | undefined =>
  readActionPath(recordedActions(row)) ?? recordedLocation(row);

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
