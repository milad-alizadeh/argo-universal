import type { SubagentUpdate, TextContent } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import {
  openAcpFeedSession,
  parentSubagentUpdates,
  waitForAcpSessionIdle,
} from '#mocks/acp-feed';

it.each(['parent', 'sibling', 'unassociated'] as const)(
  'retains the explicit %s sender across patches on a child transcript',
  async (sender) => {
    const { host, sessionId } = await openAcpFeedSession({
      sessionIds: ['parent'],
      steps: [
        {
          type: 'update',
          update: {
            sessionUpdate: 'subagent_update',
            sessionId: 'sibling',
            title: 'Sender',
          },
        },
        {
          type: 'update',
          update: {
            sessionUpdate: 'subagent_update',
            sessionId: 'recipient',
            title: 'Recipient',
          },
        },
        {
          type: 'update',
          sessionId: 'recipient',
          update: {
            sessionUpdate: 'session_message',
            messageId: 'instruction',
            senderSessionId: sender,
            recipientSessionId: 'recipient',
            content: [{ type: 'text', text: 'Original' }],
          },
        },
        {
          type: 'update',
          sessionId: 'recipient',
          update: {
            sessionUpdate: 'session_message',
            messageId: 'instruction',
            recipientSessionId: 'recipient',
            content: [{ type: 'text', text: 'Updated instruction' }],
          },
        },
      ],
    });

    const children = await host.caller.session.subagents({ sessionId });
    const sibling = children.find((child) => child.title === 'Sender');
    const recipient = children.find((child) => child.title === 'Recipient');

    if (!sibling || !recipient) throw new Error('Missing Subagents');

    const page = await host.caller.feed.page({
      sessionId: recipient.sessionId,
      direction: 'tail',
    });

    expect(page.rows).toHaveLength(1);
    expect(page.rows[0]).toMatchObject({
      content: [{ type: 'text', text: 'Updated instruction' }],
    });

    const senderIds = new Map([
      ['parent', sessionId],
      ['sibling', sibling.sessionId],
    ]);

    const [message] = page.rows;

    if (message?.sessionUpdate !== 'session_message')
      throw new Error('Missing delegated message');

    expect(message._meta?.argo?.senderSessionId).toBe(senderIds.get(sender));
    expect(children).toHaveLength(2);
  },
);

type ParentFeedHost = Awaited<ReturnType<typeof openAcpFeedSession>>['host'];

type SubagentRowFacts = NonNullable<
  NonNullable<SubagentUpdate['_meta']>['argo']
> &
  Pick<SubagentUpdate, 'subagentState'>;

// What the parent Feed says about its Subagents, in Feed order.
const subagentRowFacts = async (
  host: ParentFeedHost,
  sessionId: string,
): Promise<SubagentRowFacts[]> =>
  (await parentSubagentUpdates(host, sessionId)).map((row) => ({
    ...row._meta?.argo,
    subagentState: row.subagentState,
  }));

const text = (value: string): TextContent => ({ type: 'text', text: value });

const foregroundActions = [
  { action: 'spawn', subagentState: 'running' },
  { action: 'message', prompt: [text('Review the change.')] },
  { subagentState: 'requires_action' },
  { subagentState: 'running' },
  { result: [text('The change looks correct.')] },
  { subagentState: 'idle' },
];

it.each([
  { scenario: 'subagent-foreground', prompts: 1, actions: foregroundActions },
  {
    scenario: 'subagent-more-work',
    prompts: 2,
    actions: [
      ...foregroundActions,
      { action: 'message', prompt: [text('Review the follow-up change.')] },
      { subagentState: 'running' },
      { subagentState: 'idle' },
    ],
  },
] as const)(
  'records each Subagent action of $scenario on the parent Feed',
  async ({ scenario, prompts, actions }) => {
    const { host, sessionId } = await openAcpFeedSession(scenarios[scenario]);

    for (let index = 1; index < prompts; index++) {
      await host.caller.session.prompt({
        sessionId,
        prompt: [text('More work')],
      });
      await waitForAcpSessionIdle(host, sessionId);
    }

    expect(await subagentRowFacts(host, sessionId)).toEqual(actions);
  },
);

const childReply = (
  transcript: string | undefined,
  update: { senderSessionId: string; recipientSessionId: string | undefined },
): ScriptedStep[] => [
  {
    type: 'update',
    sessionId: transcript,
    update: {
      sessionUpdate: 'session_message',
      messageId: 'reply',
      ...update,
      content: [text('Done')],
    },
  },
  {
    type: 'update',
    sessionId: transcript,
    update: {
      sessionUpdate: 'session_message_chunk',
      messageId: 'reply',
      content: text(' and checked'),
    },
  },
];

const fromChild = { senderSessionId: 'child', recipientSessionId: 'parent' };

it.each([
  {
    reply: 'explicitly addressed on the parent transcript',
    steps: childReply(undefined, fromChild),
    result: [text('Done'), text(' and checked')],
  },
  {
    reply: 'revised by a later patch',
    steps: [
      ...childReply(undefined, fromChild),
      {
        type: 'update',
        update: {
          sessionUpdate: 'session_message',
          messageId: 'reply',
          content: [text('Revised')],
        },
      } satisfies ScriptedStep,
    ],
    result: [text('Revised')],
  },
  {
    reply: 'without a recipient',
    steps: childReply(undefined, {
      ...fromChild,
      recipientSessionId: undefined,
    }),
    result: undefined,
  },
  {
    reply: 'addressed to another Session',
    steps: childReply(undefined, { ...fromChild, recipientSessionId: 'other' }),
    result: undefined,
  },
  {
    reply: 'from a Session that is not its child',
    steps: childReply(undefined, { ...fromChild, senderSessionId: 'stranger' }),
    result: undefined,
  },
  {
    reply: "on the child's own transcript",
    steps: childReply('child', fromChild),
    result: undefined,
  },
])(
  'sets a result only from a child reply $reply',
  async ({ steps, result }) => {
    const { host, sessionId } = await openAcpFeedSession({
      sessionIds: ['parent'],
      steps: [
        {
          type: 'update',
          update: { sessionUpdate: 'subagent_update', sessionId: 'child' },
        },
        ...steps,
        {
          type: 'update',
          sessionId: 'child',
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: text('Child output is never a result'),
          },
        },
      ],
    });

    expect(await subagentRowFacts(host, sessionId)).toEqual([
      { action: 'spawn' },
      ...(result ? [{ result }] : []),
    ]);
  },
);

it.each([
  {
    message: "the parent's own message on the parent transcript",
    transcript: undefined,
    senderSessionId: 'parent',
    actions: [
      { action: 'spawn' },
      { action: 'spawn' },
      { action: 'message', prompt: [text('Check the tests')] },
    ],
  },
  {
    message: 'a message with no sender on the parent transcript',
    transcript: undefined,
    senderSessionId: undefined,
    actions: [{ action: 'spawn' }, { action: 'spawn' }],
  },
  {
    message: "a sibling's message on the parent transcript",
    transcript: undefined,
    senderSessionId: 'sibling',
    actions: [{ action: 'spawn' }, { action: 'spawn' }],
  },
  {
    message: "the parent's message on the child's own transcript",
    transcript: 'child',
    senderSessionId: 'parent',
    actions: [{ action: 'spawn' }, { action: 'spawn' }],
  },
])(
  'records a parent prompt only from $message',
  async ({ transcript, senderSessionId, actions }) => {
    const { host, sessionId } = await openAcpFeedSession({
      sessionIds: ['parent'],
      steps: [
        {
          type: 'update',
          update: { sessionUpdate: 'subagent_update', sessionId: 'sibling' },
        },
        {
          type: 'update',
          update: { sessionUpdate: 'subagent_update', sessionId: 'child' },
        },
        {
          type: 'update',
          sessionId: transcript,
          update: {
            sessionUpdate: 'session_message',
            messageId: 'instruction',
            senderSessionId,
            recipientSessionId: 'child',
            content: [text('Check the tests')],
          },
        },
      ],
    });

    expect(await subagentRowFacts(host, sessionId)).toEqual(actions);
  },
);

const onTranscript = (
  update: Extract<ScriptedStep, { type: 'update' }>['update'],
  sessionId?: string,
): ScriptedStep => ({ type: 'update', sessionId, update });

const associated: ScriptedStep = {
  type: 'update',
  update: { sessionUpdate: 'subagent_update', sessionId: 'review' },
};

it.each([
  {
    claim: 'revises its incoming message by patch and chunk',
    steps: [
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'incoming',
          senderSessionId: 'parent',
          recipientSessionId: 'review',
          content: [text('Original')],
        },
        'review',
      ),
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'incoming',
          content: [text('Revised')],
        },
        'review',
      ),
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'incoming',
          recipientSessionId: 'review',
        },
        'review',
      ),
      onTranscript(
        {
          sessionUpdate: 'session_message_chunk',
          messageId: 'incoming',
          content: text(' instruction'),
        },
        'review',
      ),
    ],
    rows: [
      {
        messageId: 'incoming',
        content: [text('Revised'), text(' instruction')],
        sender: 'parent',
        recipient: 'child',
      },
    ],
  },
  {
    claim: 'keeps its reply to the parent as a row instead of waiting',
    steps: [
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'reply',
          senderSessionId: 'review',
          recipientSessionId: 'parent',
          content: [text('Done')],
        },
        'review',
      ),
    ],
    rows: [
      {
        messageId: 'reply',
        content: [text('Done')],
        sender: 'child',
        recipient: 'parent',
      },
    ],
  },
  {
    claim: 'leaves a missing participant missing',
    steps: [
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'incoming',
          recipientSessionId: 'review',
          content: [text('No sender')],
        },
        'review',
      ),
    ],
    rows: [
      {
        messageId: 'incoming',
        content: [text('No sender')],
        sender: undefined,
        recipient: 'child',
      },
    ],
  },
  {
    claim: 'keeps its participants when a patch names unknown ones',
    steps: [
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'incoming',
          senderSessionId: 'parent',
          recipientSessionId: 'review',
          content: [text('Original')],
        },
        'review',
      ),
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'incoming',
          senderSessionId: 'unassociated',
          recipientSessionId: 'other',
          content: [text('Revised')],
        },
        'review',
      ),
    ],
    rows: [
      {
        messageId: 'incoming',
        content: [text('Revised')],
        sender: 'parent',
        recipient: 'child',
      },
    ],
  },
  {
    claim:
      'is never selected by a parent message with the same id and no recipient',
    steps: [
      onTranscript(
        {
          sessionUpdate: 'session_message',
          messageId: 'shared',
          senderSessionId: 'parent',
          content: [text('Child view')],
        },
        'review',
      ),
      onTranscript({
        sessionUpdate: 'session_message',
        messageId: 'shared',
        content: [text('Parent view')],
      }),
      onTranscript({
        sessionUpdate: 'session_message_chunk',
        messageId: 'shared',
        content: text(' chunk'),
      }),
    ],
    rows: [
      {
        messageId: 'shared',
        content: [text('Child view')],
        sender: 'parent',
        recipient: undefined,
      },
    ],
  },
] as const)("the child's own transcript $claim", async ({ steps, rows }) => {
  const { host, sessionId } = await openAcpFeedSession({
    sessionIds: ['parent'],
    steps: [associated, ...steps],
  });

  const [child] = await host.caller.session.subagents({ sessionId });

  if (!child) throw new Error('Missing Subagent');

  const sessions = new Map([
    ['parent', sessionId],
    ['child', child.sessionId],
  ]);

  const page = await host.caller.feed.page({
    sessionId: child.sessionId,
    direction: 'tail',
  });

  expect(
    page.rows.flatMap((row) =>
      row.sessionUpdate === 'session_message'
        ? [
            {
              messageId: row.messageId,
              content: row.content,
              senderSessionId: row._meta?.argo?.senderSessionId,
              recipientSessionId: row._meta?.argo?.recipientSessionId,
            },
          ]
        : [],
    ),
  ).toEqual(
    rows.map(({ sender, recipient, ...row }) => ({
      ...row,
      senderSessionId: sender && sessions.get(sender),
      recipientSessionId: recipient && sessions.get(recipient),
    })),
  );
});
