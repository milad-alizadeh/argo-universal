import { expect, it } from 'vitest';
import type { FeedUpdate } from '../src/agent-events';
import {
  editCommandFixture,
  agentFeedEvent,
  appFilePath,
  agentTurnEndedEvent,
  mapResponses,
  settledRows,
} from './mocks/mapping';

it('preserves every recorded file change and patch in one Tool call', (): void => {
  const rows = settledRows(mapResponses('file-change'));
  expect(
    rows.filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    ),
  ).toEqual([
    expect.objectContaining({
      kind: 'edit',
      status: 'completed',
      locations: [{ path: appFilePath }, { path: '/repo/notes.md' }],
      content: [
        {
          type: 'diff',
          changes: [
            { operation: 'modify', path: appFilePath },
            { operation: 'add', path: '/repo/notes.md', newText: 'hello\n' },
          ],
          patch: {
            format: 'git_patch',
            text: expect.stringContaining('-beta\n+gamma\n'),
          },
        },
      ],
    }),
  ]);
});

it('maps recorded command output, exit status and usage without repeating the final text', (): void => {
  const events = mapResponses(editCommandFixture);
  const tools = settledRows(events).filter(
    (row): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
      row.sessionUpdate === 'tool_call_update',
  );
  expect(tools).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'execute',
        status: 'completed',
        content: [
          expect.objectContaining({
            type: 'terminal',
            command: expect.stringContaining('cat app.txt notes.md'),
            output: 'alpha\ngamma\nhello\n',
            exitStatus: { exitCode: 0 },
          }),
        ],
      }),
    ]),
  );
  expect(events).toEqual(
    expect.arrayContaining([
      { type: 'agent.usage', usage: { used: 17120, size: 258400 } },
    ]),
  );
  expect(settledRows(events).at(-1)).toMatchObject({
    sessionUpdate: 'agent_message',
    content: [{ type: 'text', text: 'done' }],
  });
});

it('ends the recorded interrupted Turn and settles its unfinished command', (): void => {
  const events = mapResponses('interrupt');
  expect(events.at(-1)).toMatchObject({
    type: agentTurnEndedEvent,
    stopReason: 'cancelled',
  });
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: agentFeedEvent,
        change: expect.objectContaining({
          type: 'patch',
          set: expect.objectContaining({
            state: 'settled',
            status: 'cancelled',
          }),
        }),
      }),
    ]),
  );
});

it('retains the recorded cancellation time when the Tool call never sends a final item', (): void => {
  const events = mapResponses('interrupt');
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: agentFeedEvent,
        change: expect.objectContaining({
          type: 'patch',
          set: expect.objectContaining({
            _meta: {
              argo: {
                startedAt: 1791172079446,
                endedAt: 1791172079454,
                commandActions: [{ type: 'unknown', command: 'sleep 30' }],
              },
            },
          }),
        }),
      }),
    ]),
  );
});
