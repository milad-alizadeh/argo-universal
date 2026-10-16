import type { SubagentUpdate, TextContent } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
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
    // The child transcript's incoming view is not the parent's outgoing message.
    expect(await subagentActions(host, sessionId)).toEqual([
      { action: 'spawn' },
      { action: 'spawn' },
    ]);
  },
);

type ParentFeedHost = Awaited<ReturnType<typeof openAcpFeedSession>>['host'];

type SubagentRowFacts = NonNullable<
  NonNullable<SubagentUpdate['_meta']>['argo']
> &
  Pick<SubagentUpdate, 'subagentState'>;

// What the parent Feed says about its Subagents, in Feed order.
const subagentActions = async (
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

    expect(await subagentActions(host, sessionId)).toEqual(actions);
  },
);

it.each([
  {
    reply: 'explicitly addressed on the parent transcript',
    transcript: undefined,
    recipientSessionId: 'parent',
    actions: [
      { action: 'spawn' },
      { result: [text('Done'), text(' and checked')] },
    ],
  },
  {
    reply: 'without a recipient',
    transcript: undefined,
    recipientSessionId: undefined,
    actions: [{ action: 'spawn' }],
  },
  {
    reply: "on the child's own transcript",
    transcript: 'child',
    recipientSessionId: 'parent',
    actions: [{ action: 'spawn' }],
  },
])(
  'sets a result only from a child reply $reply',
  async ({ transcript, recipientSessionId, actions }) => {
    const { host, sessionId } = await openAcpFeedSession({
      sessionIds: ['parent'],
      steps: [
        {
          type: 'update',
          update: { sessionUpdate: 'subagent_update', sessionId: 'child' },
        },
        {
          type: 'update',
          sessionId: transcript,
          update: {
            sessionUpdate: 'session_message',
            messageId: 'reply',
            senderSessionId: 'child',
            recipientSessionId,
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

    expect(await subagentActions(host, sessionId)).toEqual(actions);
  },
);
