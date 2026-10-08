import { describe, expect, it } from 'vitest';
import type { AgentEvent, FeedUpdate } from '../src/agent-events';
import {
  vendorSessionId,
  agentTurnEndedEvent,
  mapResponses,
  settledRows,
  upsertRows,
} from './mocks/mapping';
import { initialMappingState, toAgentEvents } from './to-agent-events';

it('reconciles the recorded Compaction start and completion into one row', (): void => {
  const events = mapResponses('compaction');
  const rows = upsertRows(events).filter(
    (row) => row.sessionUpdate === 'compaction_update',
  );
  expect(rows).toEqual([
    {
      id: vendorSessionId,
      compactionId: vendorSessionId,
      sessionUpdate: 'compaction_update',
      state: 'open',
      status: 'in_progress',
    },
    {
      id: vendorSessionId,
      compactionId: vendorSessionId,
      sessionUpdate: 'compaction_update',
      state: 'settled',
      status: 'completed',
    },
  ]);
});

describe('recorded Turns', (): void => {
  it.each(['reply', 'file-change'])(
    'maps %s with one start, one end and no vendor user messages',
    (name): void => {
      const events = mapResponses(name);
      expect(
        events.filter(
          (
            event,
          ): event is Extract<AgentEvent, { type: 'agent.turnStarted' }> =>
            event.type === 'agent.turnStarted',
        ),
      ).toEqual([{ type: 'agent.turnStarted' }]);
      expect(
        events.filter(
          (
            event,
          ): event is Extract<
            AgentEvent,
            { type: typeof agentTurnEndedEvent }
          > => event.type === agentTurnEndedEvent,
        ),
      ).toEqual([{ type: agentTurnEndedEvent, stopReason: 'end_turn' }]);
      expect(
        settledRows(events).some(
          (
            row,
          ): row is Extract<FeedUpdate, { sessionUpdate: 'user_message' }> =>
            row.sessionUpdate === 'user_message',
        ),
      ).toBe(false);
      expect(
        settledRows(events)
          .filter(
            (
              row,
            ): row is Extract<FeedUpdate, { sessionUpdate: 'agent_message' }> =>
              row.sessionUpdate === 'agent_message',
          )
          .map((row): typeof row.content => row.content),
      ).toEqual([[{ type: 'text', text: name === 'reply' ? 'OK' : 'done' }]]);
    },
  );
});

it.each(['item/futureNotification', 'toString', 'constructor'])(
  'rejects an unrecognised method %s without changing the Turn mapping',
  (method): void => {
    const mappingState = {
      ...initialMappingState(),
      vendorTurnId: 'unknown-method-turn',
    };
    const message = {
      method,
      params: { turnId: 'unknown-method-turn' },
    };
    expect(
      Reflect.apply(toAgentEvents, undefined, [message, mappingState]),
    ).toEqual({
      events: [
        {
          type: 'agent.messageRejected',
          reason: 'Unrecognised vendor payload',
        },
      ],
      mappingState,
    });
  },
);
