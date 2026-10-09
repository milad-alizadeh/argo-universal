import {
  type AgentMessage,
  FeedPageInput,
  FeedPageOutput,
  FeedRowOutput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import { expect, it } from 'vitest';

const firstMessageRowId = 'message-1#0';

const row: AgentMessage = {
  id: firstMessageRowId,
  sessionId: 'session-1',
  position: 0,
  revision: 1,
  turnId: 'turn-1',
  state: 'settled',
  sessionUpdate: 'agent_message',
  messageId: 'message-1',
  content: [{ type: 'text', text: 'Hello' }],
};
const page: FeedPageOutput = {
  epoch: 0,
  maxRevision: 1,
  rows: [row],
  hasOlder: false,
  startCursor: 0,
  staleCursor: false,
};

it('keeps the Feed page mock and default paging aligned with the contract', (): void => {
  expect(FeedPageOutput.parse(page)).toEqual(page);
  expect(
    FeedPageInput.parse({ sessionId: 'session-1', direction: 'tail' }),
  ).toEqual({ sessionId: 'session-1', direction: 'tail', limit: 40 });
});
it('rejects a Feed page limit above 200', (): void => {
  expect(
    FeedPageInput.safeParse({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 201,
    }).success,
  ).toBe(false);
});
it('rejects an unknown Feed row tag', (): void => {
  expect(
    FeedRowOutput.safeParse({ ...row, sessionUpdate: 'agent_monologue' })
      .success,
  ).toBe(false);
});
it('keeps Feed update mocks aligned with the public contract', (): void => {
  const updates = [
    { type: 'row.upsert', rev: 1, row },
    {
      type: 'row.append',
      rev: 2,
      id: firstMessageRowId,
      field: 'content.0.text',
      off: 5,
      text: '!',
    },
  ];
  for (const update of updates)
    expect(FeedSubscribeOutput.parse(update)).toEqual(update);
});
it('rejects a fractional Feed position', (): void => {
  expect(
    FeedSubscribeOutput.safeParse({
      type: 'row.upsert',
      rev: 1,
      row: { ...row, position: -0.5 },
    }).success,
  ).toBe(false);
});
