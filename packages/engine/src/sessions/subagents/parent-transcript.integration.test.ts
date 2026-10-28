import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import {
  associate,
  onTranscript,
  played,
  sessionMessage,
  sessionMessageChunk,
  subagentRowFacts,
  text,
} from '#mocks/subagent-steps';

const childReply = (
  transcript: string | undefined,
  participants: {
    senderSessionId: string;
    recipientSessionId: string | undefined;
  },
): ScriptedStep[] => [
  sessionMessage(
    'reply',
    { ...participants, content: [text('Done')] },
    transcript,
  ),
  sessionMessageChunk('reply', ' and checked', transcript),
];

const fromChild = { senderSessionId: 'child', recipientSessionId: 'parent' };

it.each([
  {
    reply: 'explicitly addressed on the parent transcript',
    steps: childReply(undefined, fromChild),
    result: [{ result: [text('Done'), text(' and checked')] }],
  },
  {
    reply: 'revised by a later patch',
    steps: [
      ...childReply(undefined, fromChild),
      sessionMessage('reply', { content: [text('Revised')] }),
    ],
    result: [{ result: [text('Revised')] }],
  },
  {
    reply: 'without a recipient',
    steps: childReply(undefined, {
      ...fromChild,
      recipientSessionId: undefined,
    }),
    result: [],
  },
  {
    reply: 'addressed to another Session',
    steps: childReply(undefined, { ...fromChild, recipientSessionId: 'other' }),
    result: [],
  },
  {
    reply: 'from a Session that is not its child',
    steps: childReply(undefined, { ...fromChild, senderSessionId: 'stranger' }),
    result: [],
  },
  {
    reply: "on the child's own transcript",
    steps: childReply('child', fromChild),
    result: [],
  },
])(
  'sets a result only from a child reply $reply',
  async ({ steps, result }) => {
    const subagents = await played([
      associate('child'),
      ...steps,
      onTranscript(
        {
          sessionUpdate: 'agent_message_chunk',
          content: text('Child output is never a result'),
        },
        'child',
      ),
    ]);

    expect(subagentRowFacts(subagents)).toEqual([
      { action: 'spawn' },
      ...result,
    ]);
  },
);

const spawns = [{ action: 'spawn' }, { action: 'spawn' }];

it.each([
  {
    message: "the parent's own message on the parent transcript",
    transcript: undefined,
    senderSessionId: 'parent',
    actions: [
      ...spawns,
      { action: 'message', prompt: [text('Check the tests')] },
    ],
  },
  {
    message: 'a message with no sender on the parent transcript',
    transcript: undefined,
    senderSessionId: undefined,
    actions: spawns,
  },
  {
    message: "a sibling's message on the parent transcript",
    transcript: undefined,
    senderSessionId: 'sibling',
    actions: spawns,
  },
  {
    message: "the parent's message on the child's own transcript",
    transcript: 'child',
    senderSessionId: 'parent',
    actions: spawns,
  },
])(
  'records a parent prompt only from $message',
  async ({ transcript, senderSessionId, actions }) => {
    const subagents = await played([
      associate('sibling'),
      associate('child'),
      sessionMessage(
        'instruction',
        {
          senderSessionId,
          recipientSessionId: 'child',
          content: [text('Check the tests')],
        },
        transcript,
      ),
    ]);

    expect(subagentRowFacts(subagents)).toEqual(actions);
  },
);
