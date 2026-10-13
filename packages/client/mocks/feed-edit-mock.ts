import type {
  DiffChange,
  SessionUpdate,
  ToolCallContent,
  ToolCallUpdate,
} from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import type { FileDiff } from '../src/features/feed/view/file-diff';
import { toFileDiffs } from '../src/features/feed/view/file-diff';
import type { MockAgent } from '../src/lib/product/feed-message.mocks';

export function recordedEdit(
  agent: MockAgent,
  recording = 'edit-and-command',
  operation: DiffChange['operation'] = 'modify',
): ToolCallUpdate {
  return requireEdit({ agent, recording, operation });
}

export function recordedFile(
  agent: MockAgent,
  recording = 'edit-and-command',
  operation: DiffChange['operation'] = 'modify',
): FileDiff {
  return requireFile({ agent, recording, operation });
}

function recordedRows(
  agent: MockAgent,
  recording: string,
): SessionUpdate[] | undefined {
  return recordedFeedMocks.find(
    (mock) => mock.agent === agent && mock.recording === recording,
  )?.rows;
}
function hasEdit(
  row: SessionUpdate,
  operation: DiffChange['operation'],
): boolean {
  return (
    row.sessionUpdate === 'tool_call_update' &&
    row.content.some((block) => hasOperation(block, operation))
  );
}
function hasOperation(
  block: ToolCallContent,
  operation: DiffChange['operation'],
): boolean {
  return (
    block.type === 'diff' &&
    block.changes.some((change) => change.operation === operation)
  );
}
function blockFiles(block: ToolCallContent): FileDiff[] {
  return block.type === 'diff' ? toFileDiffs(block) : [];
}

type EditScenario = {
  agent: MockAgent;
  recording: string;
  operation: DiffChange['operation'];
};
function requireEdit(scenario: EditScenario): ToolCallUpdate {
  const row = findEdit(scenario);
  if (!row)
    throw new Error(
      `No recorded edit ${scenario.agent}/${scenario.recording}/${scenario.operation}`,
    );
  return row;
}
function findEdit({
  agent,
  recording,
  operation,
}: EditScenario): ToolCallUpdate | undefined {
  return recordedRows(agent, recording)
    ?.filter((row) => row.sessionUpdate === 'tool_call_update')
    .find((row) => hasEdit(row, operation));
}
function requireFile({ agent, recording, operation }: EditScenario): FileDiff {
  const file = recordedEdit(agent, recording, operation)
    .content.flatMap(blockFiles)
    .find((file) => file.operation === operation);
  if (!file)
    throw new Error(`No recorded file ${agent}/${recording}/${operation}`);
  return file;
}
