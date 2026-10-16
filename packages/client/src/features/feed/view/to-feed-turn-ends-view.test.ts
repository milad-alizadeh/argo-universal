import { type Notice, StopReason, TurnEnd } from '@repo/contracts';
import { expect, it } from 'vitest';
import { commandRow, workMocks } from '../../../../mocks/feed-view.mocks';
import { feedItemKey } from './feed-view';
import { toFeedView } from './to-feed-view';

it.each(StopReason.options)(
  'projects %s after the Turn’s last group',
  (stopReason) => {
    const mock = workMocks[0];

    if (!mock) throw new Error('Recording needs work');
    const first = commandRow(mock.rows);
    const last = { ...first, id: 'last-command' };
    const end: TurnEnd = { stopReason, error: null, durationMs: 80_000 };

    const marker: Notice = {
      id: 'turn:end',
      sessionId: first.sessionId,
      turnId: first.turnId,
      position: first.position + 2,
      revision: first.revision + 2,
      state: 'settled',
      sessionUpdate: 'notice',
      severity: 'info',
      title: 'Turn ended',
      _meta: { argo: { turnEnd: end } },
    };

    const next = { ...first, id: 'next-command', turnId: 'next-turn' };
    const view = toFeedView([first, last, marker, next], mock.snapshot);
    expect(view.items).toEqual([
      {
        type: 'group',
        id: first.id,
        title: 'Ran 2 commands',
        state: 'settled',
        items: [
          { type: 'tool_call', row: first },
          { type: 'tool_call', row: last },
        ],
      },
      { type: 'turn_end', row: marker, end },
      { type: 'tool_call', row: next },
    ]);
    expect(view.items.map(feedItemKey)).toEqual([first.id, marker.id, next.id]);
    expect(toFeedView([marker], mock.snapshot).items).toEqual([
      { type: 'turn_end', row: marker, end },
    ]);
  },
);

it('retains error details and rejects the removed cancel_timeout ending', () => {
  const error = {
    code: 'interrupted',
    message: 'Agent exited with status 17',
  } as const;

  expect(TurnEnd.parse({ stopReason: 'error', error, durationMs: 0 })).toEqual({
    stopReason: 'error',
    error,
    durationMs: 0,
  });
  expect(
    TurnEnd.safeParse({
      stopReason: 'cancel_timeout',
      error: null,
      durationMs: 0,
    }).success,
  ).toBe(false);
});
