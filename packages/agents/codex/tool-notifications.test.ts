import type { CommandAction, ToolCallUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import type { FeedUpdate } from '../src/agent-events';
import {
  editCommandFixture,
  appFilePath,
  mapMessages,
  mapResponses,
  withCommandActions,
  settledRows,
} from './mocks/mapping';
import type { CommandAction as SuppliedCommandAction } from './protocol.gen';

it('exposes only the command actions the Agent supplied, including unknown actions', (): void => {
  const tools = settledRows(mapResponses(editCommandFixture))
    .filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    )
    .filter((row): boolean => row.kind === 'execute');
  expect(tools).toEqual([
    expect.objectContaining({
      _meta: {
        argo: expect.objectContaining({
          commandActions: [
            { type: 'read', command: 'cat app.txt', path: appFilePath },
          ],
        }),
      },
    }),
    expect.objectContaining({
      _meta: {
        argo: expect.objectContaining({
          commandActions: [
            { type: 'unknown', command: 'cat app.txt notes.md' },
          ],
        }),
      },
    }),
  ]);
});

it('keeps the recorded Tool call start and end times', (): void => {
  const tools = settledRows(mapResponses(editCommandFixture))
    .filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    )
    .filter((row): boolean => row.kind === 'execute');
  expect(
    tools.map(
      (row): NonNullable<ToolCallUpdate['_meta']>['argo'] => row._meta?.argo,
    ),
  ).toEqual([
    expect.objectContaining({
      startedAt: 1791172062416,
      endedAt: 1791172062416,
    }),
    expect.objectContaining({
      startedAt: 1791172072705,
      endedAt: 1791172072705,
    }),
  ]);
});

it('omits command actions when the Agent supplies none, even for a read-shaped command', (): void => {
  const messages = withCommandActions([]);
  const tools = settledRows(mapMessages(messages))
    .filter(
      (
        row,
      ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update',
    )
    .filter((row): boolean => row.kind === 'execute');
  expect(tools).toHaveLength(2);
  for (const tool of tools)
    expect(tool._meta?.argo).not.toHaveProperty('commandActions');
});

it.each([
  {
    supplied: { type: 'listFiles', command: 'ls', path: '/repo' },
    expected: { type: 'list', command: 'ls', path: '/repo' },
  },
  {
    supplied: {
      type: 'search',
      command: 'rg alpha',
      query: 'alpha',
      path: null,
    },
    expected: { type: 'search', command: 'rg alpha', query: 'alpha' },
  },
  {
    supplied: { type: 'listFiles', command: 'ls', path: null },
    expected: { type: 'list', command: 'ls' },
  },
] satisfies { supplied: SuppliedCommandAction; expected: CommandAction }[])(
  'maps supplied $supplied.type metadata without inventing a missing path',
  ({ supplied, expected }): void => {
    const messages = withCommandActions([supplied]);
    const tools = settledRows(mapMessages(messages))
      .filter(
        (
          row,
        ): row is Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }> =>
          row.sessionUpdate === 'tool_call_update',
      )
      .filter((row): boolean => row.kind === 'execute');
    expect(
      tools.map(
        (tool): CommandAction[] | undefined => tool._meta?.argo?.commandActions,
      ),
    ).toEqual([[expected], [expected]]);
  },
);
