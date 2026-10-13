import type { Notice } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { workMocks, commandRow } from '../../../../mocks/feed-view.mocks';
import { toFeedView } from './to-feed-view';

describe.each(workMocks)('Notice grouping for $agent', ({ rows, snapshot }) => {
  it.each(['info', 'warning'] as const)(
    'groups a %s Notice with the commands around it',
    (severity) => {
      const first = commandRow(rows);
      const last = { ...first, id: 'last-command' };

      const notice: Notice = {
        id: 'notice',
        sessionId: first.sessionId,
        turnId: first.turnId,
        position: first.position,
        revision: first.revision,
        state: 'settled',
        sessionUpdate: 'notice',
        severity,
        title: 'Session notice',
      };

      expect(toFeedView([first, notice, last], snapshot).items).toEqual([
        {
          type: 'group',
          id: first.id,
          title: 'Ran 2 commands',
          state: 'settled',
          items: [
            { type: 'tool_call', row: first },
            { type: 'row', row: notice },
            { type: 'tool_call', row: last },
          ],
        },
      ]);
    },
  );

  it('draws an error Notice on its own row between the commands', () => {
    const first = commandRow(rows);
    const last = { ...first, id: 'last-command' };

    const notice: Notice = {
      id: 'notice',
      sessionId: first.sessionId,
      turnId: first.turnId,
      position: first.position,
      revision: first.revision,
      state: 'settled',
      sessionUpdate: 'notice',
      severity: 'error',
      title: 'Session notice',
    };

    expect(toFeedView([first, notice, last], snapshot).items).toEqual([
      { type: 'tool_call', row: first },
      { type: 'row', row: notice },
      { type: 'tool_call', row: last },
    ]);
  });
});

it.each(workMocks)(
  'starts a new group for an Agent-started Turn for $agent',
  ({ rows, snapshot }) => {
    const first = commandRow(rows);
    const next = { ...first, id: 'next-turn', turnId: 'turn-2' };
    expect(toFeedView([first, next], snapshot).items).toEqual([
      { type: 'tool_call', row: first },
      { type: 'tool_call', row: next },
    ]);
  },
);
