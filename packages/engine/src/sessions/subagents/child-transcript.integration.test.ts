import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import {
  associate,
  messageFacts,
  played,
  sessionMessage,
  sessionMessageChunk,
  text,
  type Participants,
} from '#mocks/subagent-steps';

const toReview = { recipientSessionId: 'review' };

const fromParent = { senderSessionId: 'parent', ...toReview };

// The child transcript's view of the message it receives.
const childView = (participants: Participants, content: string): ScriptedStep =>
  sessionMessage(
    'incoming',
    { ...participants, content: [text(content)] },
    'review',
  );

it.each(['parent', 'sibling', 'unassociated'] as const)(
  'retains the explicit %s sender across patches on a child transcript',
  async (sender) => {
    const subagents = await played([
      associate('sibling'),
      associate('review'),
      childView({ senderSessionId: sender, ...toReview }, 'Original'),
      childView(toReview, 'Updated instruction'),
    ]);

    const senders = new Map([
      ['parent', subagents.parentId],
      ['sibling', subagents.childId('sibling')],
    ]);

    expect(messageFacts(subagents.rows('review'))).toEqual([
      {
        messageId: 'incoming',
        content: [text('Updated instruction')],
        senderSessionId: senders.get(sender),
        recipientSessionId: subagents.childId('review'),
      },
    ]);
  },
);

it.each([
  {
    claim: 'revises its incoming message by patch and chunk',
    steps: [
      childView(fromParent, 'Original'),
      sessionMessage('incoming', { content: [text('Revised')] }, 'review'),
      sessionMessage('incoming', toReview, 'review'),
      sessionMessageChunk('incoming', ' instruction', 'review'),
    ],
    row: {
      messageId: 'incoming',
      content: [text('Revised'), text(' instruction')],
      sender: 'parent',
      recipient: 'child',
    },
  },
  {
    claim: 'keeps its reply to the parent as a row instead of waiting',
    steps: [
      sessionMessage(
        'reply',
        {
          senderSessionId: 'review',
          recipientSessionId: 'parent',
          content: [text('Done')],
        },
        'review',
      ),
    ],
    row: {
      messageId: 'reply',
      content: [text('Done')],
      sender: 'child',
      recipient: 'parent',
    },
  },
  {
    claim: 'leaves a missing participant missing',
    steps: [childView(toReview, 'No sender')],
    row: {
      messageId: 'incoming',
      content: [text('No sender')],
      sender: undefined,
      recipient: 'child',
    },
  },
  {
    claim: 'keeps its participants when a patch names unknown ones',
    steps: [
      childView(fromParent, 'Original'),
      childView(
        { senderSessionId: 'unassociated', recipientSessionId: 'other' },
        'Revised',
      ),
    ],
    row: {
      messageId: 'incoming',
      content: [text('Revised')],
      sender: 'parent',
      recipient: 'child',
    },
  },
  {
    claim:
      'is never selected by a parent message with the same id and no recipient',
    steps: [
      sessionMessage(
        'shared',
        { senderSessionId: 'parent', content: [text('Child view')] },
        'review',
      ),
      sessionMessage('shared', { content: [text('Parent view')] }),
      sessionMessageChunk('shared', ' chunk'),
    ],
    row: {
      messageId: 'shared',
      content: [text('Child view')],
      sender: 'parent',
      recipient: undefined,
    },
  },
] as const)("the child's own transcript $claim", async ({ steps, row }) => {
  const subagents = await played([associate('review'), ...steps]);

  const sessions = new Map<string | undefined, string>([
    ['parent', subagents.parentId],
    ['child', subagents.childId('review')],
  ]);

  const { sender, recipient, ...message } = row;

  expect(messageFacts(subagents.rows('review'))).toEqual([
    {
      ...message,
      senderSessionId: sessions.get(sender),
      recipientSessionId: sessions.get(recipient),
    },
  ]);
});
