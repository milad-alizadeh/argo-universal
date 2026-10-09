import type { DiffChange, ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import type { FileDiff } from '../src/feed/file-diff';
import { toFileDiffs } from '../src/feed/file-diff';
import type { MockAgent } from './feed-message-mock';

export function recordedEdit(
  agent: MockAgent,
  recording = 'edit-and-command',
  operation: DiffChange['operation'] = 'modify',
): ToolCallUpdate {
  const row = recordedFeedMocks
    .find((mock) => mock.agent === agent && mock.recording === recording)
    ?.rows.find(
      (row) =>
        row.sessionUpdate === 'tool_call_update' &&
        row.content.some(
          (block) =>
            block.type === 'diff' &&
            block.changes.some((change) => change.operation === operation),
        ),
    );
  if (row?.sessionUpdate !== 'tool_call_update')
    throw new Error(`No recorded edit ${agent}/${recording}/${operation}`);
  return row;
}

export function recordedFile(
  agent: MockAgent,
  recording = 'edit-and-command',
  operation: DiffChange['operation'] = 'modify',
): FileDiff {
  const row = recordedEdit(agent, recording, operation);
  const file = row.content
    .flatMap((block) => (block.type === 'diff' ? toFileDiffs(block) : []))
    .find((file) => file.operation === operation);
  if (!file)
    throw new Error(`No recorded file ${agent}/${recording}/${operation}`);
  return file;
}
