import { expect, it } from 'vitest';
import type { VendorMessage } from './messages';
import {
  agentFeedEvent,
  thoughtTurnId,
  checkFilesPrompt,
  mapMessages,
  settledRows,
} from './mocks/mapping';

it('reconciles a thought summary with its final record and drops raw thought text once a summary streams', (): void => {
  const messages: VendorMessage[] = [
    {
      method: 'turn/started',
      params: {
        threadId: 'thread',
        turn: {
          id: thoughtTurnId,
          status: 'inProgress',
          error: null,
          items: [],
          itemsView: 'full',
          startedAt: null,
          completedAt: null,
          durationMs: null,
        },
      },
    },
    {
      method: 'item/started',
      params: {
        startedAtMs: 0,
        threadId: 'thread',
        turnId: thoughtTurnId,
        item: { type: 'reasoning', id: 'thought', summary: [], content: [] },
      },
    },
    {
      method: 'item/reasoning/summaryTextDelta',
      params: {
        threadId: 'thread',
        turnId: thoughtTurnId,
        itemId: 'thought',
        summaryIndex: 0,
        delta: checkFilesPrompt,
      },
    },
    {
      method: 'item/reasoning/textDelta',
      params: {
        threadId: 'thread',
        turnId: thoughtTurnId,
        itemId: 'thought',
        contentIndex: 0,
        delta: 'Raw reasoning',
      },
    },
    {
      method: 'item/completed',
      params: {
        completedAtMs: 1,
        threadId: 'thread',
        turnId: thoughtTurnId,
        item: {
          type: 'reasoning',
          id: 'thought',
          summary: [checkFilesPrompt],
          content: ['Raw reasoning'],
        },
      },
    },
  ];
  const events = mapMessages(messages);
  expect(settledRows(events)).toEqual([
    {
      id: 'thought',
      messageId: 'thought',
      sessionUpdate: 'agent_thought',
      state: 'settled',
      content: [{ type: 'text', text: checkFilesPrompt }],
    },
  ]);
  expect(
    events.filter(
      (event): boolean =>
        event.type === agentFeedEvent && event.change.type === 'append',
    ),
  ).toEqual([
    {
      type: agentFeedEvent,
      change: {
        type: 'append',
        id: 'thought',
        field: 'content.0.text',
        text: checkFilesPrompt,
      },
    },
  ]);
});
