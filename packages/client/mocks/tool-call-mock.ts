import { recordedFeedMocks } from '@repo/api/mocks';
import type { ToolCallUpdate } from '@repo/contracts';
import type { FeedGroup } from '../src/feed/feed-view';
import { toFeedView } from '../src/feed/to-feed-view';

export const commandMocks = recordedFeedMocks
  .filter((mock) => mock.recording === 'edit-and-command')
  .map((mock) => {
    const row = mock.rows.find(
      (row): row is ToolCallUpdate =>
        row.sessionUpdate === 'tool_call_update' &&
        row.kind === 'execute' &&
        !row._meta?.argo?.commandActions?.some(
          (action) => action.type === 'read',
        ),
    );
    if (!row) throw new Error('Recording needs a command');
    return { agent: mock.agent, row };
  });

export const completedCommand =
  commandMocks[0]?.row ?? missingRecordedState('a command');

const commandOutcomes = recordedFeedMocks
  .filter((mock) => mock.recording === 'command-outcomes')
  .flatMap((mock) => mock.rows)
  .filter(
    (row): row is ToolCallUpdate => row.sessionUpdate === 'tool_call_update',
  );

export const longOutputCommand =
  commandOutcomes.find((row) => row.status === 'completed') ??
  missingRecordedState('long output');

export const failedCommand =
  commandOutcomes.find((row) => row.status === 'failed') ??
  missingRecordedState('a failed command');

export const stoppedCommand =
  recordedFeedMocks
    .filter((mock) => mock.recording === 'interrupt')
    .flatMap((mock) => mock.rows)
    .find(
      (row): row is ToolCallUpdate =>
        row.sessionUpdate === 'tool_call_update' && row.status === 'cancelled',
    ) ?? missingRecordedState('a stopped command');

export const runningCommand =
  recordedFeedMocks
    .flatMap((mock) => mock.stream)
    .flatMap((event) => ('row' in event ? [event.row] : []))
    .find(
      (row): row is ToolCallUpdate =>
        row.sessionUpdate === 'tool_call_update' &&
        row.toolCallId === completedCommand.toolCallId &&
        row.status === 'in_progress',
    ) ?? missingRecordedState('a running command');

export const commandNow = (runningCommand._meta?.argo?.startedAt ?? 0) + 23000;

export const toolCallGroupMocks = recordedFeedMocks
  .filter((mock) => mock.recording === 'edit-and-command')
  .map((mock) => {
    const rows = mock.rows.filter(
      (row): row is ToolCallUpdate =>
        row.sessionUpdate === 'tool_call_update' &&
        ['read', 'search', 'execute'].includes(row.kind),
    );
    const group = toFeedView(rows, mock.snapshot).items.find(
      (item): item is FeedGroup => item.type === 'group',
    );
    if (!group) throw new Error('Recording needs a Tool call group');
    const command = rows.find(
      (row) =>
        row.kind === 'execute' &&
        !row._meta?.argo?.commandActions?.some(
          (action) => action.type === 'read',
        ),
    );
    if (!command) throw new Error('Recording needs a command');
    const active = mock.stream
      .flatMap((event) => ('row' in event ? [event.row] : []))
      .find(
        (row): row is ToolCallUpdate =>
          row.sessionUpdate === 'tool_call_update' &&
          row.toolCallId === command.toolCallId &&
          row.status === 'in_progress',
      );
    if (!active) throw new Error('Recording needs a running command');
    const running = toFeedView(
      rows.map((row) => (row.id === active.id ? active : row)),
      mock.snapshot,
    ).items.find((item): item is FeedGroup => item.type === 'group');
    if (!running) throw new Error('Recording needs a running group');
    const exploration = group.items.find((item) => item.type === 'exploration');
    if (!exploration) throw new Error('Recording needs exploration');
    return {
      agent: mock.agent,
      group,
      running,
      exploration,
      now: (active._meta?.argo?.startedAt ?? 0) + 23000,
    };
  });

export const toolCallGroupMock =
  toolCallGroupMocks[0] ?? missingRecordedState('a group');

function missingRecordedState(state: string): never {
  throw new Error(`Recording needs ${state}`);
}
