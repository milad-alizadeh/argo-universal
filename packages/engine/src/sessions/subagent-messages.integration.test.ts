import { expect, it } from 'vitest';
import { openAcpFeedSession } from '#mocks/acp-feed';

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
