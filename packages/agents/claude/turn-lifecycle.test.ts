import { expect, it } from 'vitest';
import {
  mapAll,
  feedChanges,
  foldRows,
  result,
  failedResult,
} from './mocks/mapping';
import { interrupted } from './mocks/sdk-interrupt';
import { edits } from './mocks/sdk-tools';
const agentTurnEndedEvent = 'agent.turnEnded';
it('streams text before its record settles it', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);
  const rows = foldRows(feedChanges(events));

  const changes = feedChanges(events);
  const answerId = rows.at(-1)?.id;
  const first = changes.findIndex(
    (change): boolean =>
      change.type === 'upsert' && change.update.id === answerId,
  );
  expect(changes[first]).toMatchObject({ update: { state: 'open' } });
  expect(
    changes.some(
      (change): boolean => change.type === 'append' && change.id === answerId,
    ),
  ).toBe(true);
});
it('ends the Turn with its stop reason and usage', (): void => {
  const messages = edits;
  const { events } = mapAll(messages);

  expect(events.at(-1)).toEqual({
    type: agentTurnEndedEvent,
    stopReason: 'end_turn',
    usage: {
      totalTokens: expect.any(Number),
      inputTokens: expect.any(Number),
      outputTokens: expect.any(Number),
      thoughtTokens: expect.any(Number),
      cachedReadTokens: expect.any(Number),
      cachedWriteTokens: expect.any(Number),
    },
  });
});
it('cancels the running command and ends the Turn as cancelled', (): void => {
  const { events } = mapAll(interrupted);
  const rows = foldRows(feedChanges(events));

  expect(rows).toEqual([
    expect.objectContaining({
      name: 'Bash',
      kind: 'execute',
      status: 'cancelled',
      state: 'settled',
    }),
  ]);
  expect(events.at(-1)).toMatchObject({
    type: agentTurnEndedEvent,
    stopReason: 'cancelled',
  });
});
it.each([
  ['max_tokens', result({ stop_reason: 'max_tokens' }), 'max_tokens'],
  ['refusal', result({ stop_reason: 'refusal' }), 'refusal'],
  [
    'error_max_turns',
    failedResult({ subtype: 'error_max_turns', is_error: true, errors: [] }),
    'max_turn_requests',
  ],
  [
    'aborted_streaming',
    failedResult({
      subtype: 'error_during_execution',
      is_error: true,
      terminal_reason: 'aborted_streaming',
      errors: [],
    }),
    'cancelled',
  ],
])('maps a %s result to its stop reason', (_, message, stopReason): void => {
  const { events } = mapAll([message]);
  expect(events).toEqual([
    expect.objectContaining({ type: agentTurnEndedEvent, stopReason }),
  ]);
});
