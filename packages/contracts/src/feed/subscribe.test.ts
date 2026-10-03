import { describe, expect, it } from 'vitest';
import { FeedPageInput } from './page';
import { FeedSubscribeInput, FeedSubscribeOutput } from './subscribe';

const row = {
  id: 'row-1',
  sessionId: 'session-1',
  position: 0,
  revision: 1,
  turnId: null,
  state: 'open',
  sessionUpdate: 'agent_message',
  messageId: 'message-1',
  content: [{ type: 'text', text: 'Hel' }],
};

const snapshot = {
  state: 'requires_action',
  activeTurnId: 'turn-1',
  usage: { used: 1000, size: 200000, cost: { amount: 0.25, currency: 'USD' } },
  pendingPermission: {
    toolCallId: 'tool-1',
    title: 'Run pnpm test',
    options: [
      { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
      { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
    ],
  },
  pendingElicitation: {
    mode: 'form',
    message: 'Which branch?',
    requestedSchema: {
      type: 'object',
      properties: {
        branch: { type: 'string', title: 'Branch', enum: ['main', 'dev'] },
        labels: {
          type: 'array',
          items: { anyOf: [{ const: 'bug', title: 'Bug' }] },
        },
      },
      required: ['branch'],
    },
    toolCallId: 'tool-2',
  },
  configOptions: [
    {
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      type: 'select',
      currentValue: 'plan',
      options: [
        { value: 'plan', name: 'Plan' },
        { value: 'edit', name: 'Edit' },
      ],
    },
    { configId: 'fast', name: 'Fast', type: 'boolean', currentValue: false },
  ],
  maxRevision: 9,
  epoch: 1,
};

describe('FeedSubscribeOutput', () => {
  const events = [
    { type: 'row.upsert', rev: 1, row },
    {
      type: 'row.append',
      rev: 2,
      id: 'row-1',
      field: 'content.0.text',
      off: 3,
      text: 'lo',
    },
    { type: 'row.patch', rev: 3, id: 'row-1', set: { state: 'settled' } },
    { type: 'snapshot', snapshot },
    { type: 'reset', epoch: 2 },
  ];

  for (const event of events) {
    it(`parses ${event.type} and round-trips it through JSON`, () => {
      const parsed = FeedSubscribeOutput.parse(event);
      expect(parsed).toEqual(event);
      expect(
        FeedSubscribeOutput.parse(JSON.parse(JSON.stringify(parsed))),
      ).toEqual(parsed);
    });
  }

  it('rejects an unknown event type', () => {
    expect(
      FeedSubscribeOutput.safeParse({ type: 'row.delete', rev: 1, id: 'row-1' })
        .success,
    ).toBe(false);
  });

  it('rejects a snapshot with an unknown permission kind', () => {
    const broken = {
      ...snapshot,
      pendingPermission: {
        ...snapshot.pendingPermission,
        options: [{ optionId: 'x', name: 'X', kind: 'maybe' }],
      },
    };
    expect(
      FeedSubscribeOutput.safeParse({ type: 'snapshot', snapshot: broken })
        .success,
    ).toBe(false);
  });
});

describe('FeedSubscribeInput', () => {
  it('accepts a sync point or null', () => {
    expect(
      FeedSubscribeInput.parse({ sessionId: 'session-1', after: null }).after,
    ).toBeNull();
    expect(
      FeedSubscribeInput.parse({
        sessionId: 'session-1',
        after: { epoch: 1, revision: 4 },
      }).after,
    ).toEqual({ epoch: 1, revision: 4 });
  });
});

describe('FeedPageInput', () => {
  it('defaults the limit to 40 and caps it at 200', () => {
    expect(
      FeedPageInput.parse({ sessionId: 'session-1', direction: 'tail' }).limit,
    ).toBe(40);
    expect(
      FeedPageInput.safeParse({
        sessionId: 'session-1',
        direction: 'before',
        cursor: 10,
        limit: 201,
      }).success,
    ).toBe(false);
  });
});
