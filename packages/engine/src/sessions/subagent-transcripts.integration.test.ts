import type { ContentBlock, TextContent } from '@repo/contracts';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { openAcpFeedSession } from '#mocks/acp-feed';

// A Subagent Feed holds only what the child's own transcript reports (ACP subagents RFD, #937).

const text = (value: string): TextContent => ({ type: 'text', text: value });

const childTranscript = 'child';

type Participants = { senderSessionId?: string; recipientSessionId?: string };

const sessionMessage = (
  transcript: string | undefined,
  update: Participants & { messageId: string; content: TextContent[] },
): ScriptedStep => ({
  type: 'update',
  sessionId: transcript,
  update: { sessionUpdate: 'session_message', ...update },
});

const sessionMessageChunk = (
  transcript: string | undefined,
  messageId: string,
  value: string,
): ScriptedStep => ({
  type: 'update',
  sessionId: transcript,
  update: {
    sessionUpdate: 'session_message_chunk',
    messageId,
    content: text(value),
  },
});

const fromParent: Participants = {
  senderSessionId: 'parent',
  recipientSessionId: childTranscript,
};

type MessageFact = {
  messageId: string;
  content: ContentBlock[];
  sender?: string;
};

// The child Feed's Session messages, with the sender named by its role.
async function childMessages(steps: ScriptedStep[]): Promise<MessageFact[]> {
  const { host, sessionId } = await openAcpFeedSession({
    sessionIds: ['parent'],
    steps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: childTranscript,
        },
      },
      ...steps,
    ],
  });

  const [child] = await host.caller.session.subagents({ sessionId });

  if (!child) throw new Error('Missing Subagent');

  const page = await host.caller.feed.page({
    sessionId: child.sessionId,
    direction: 'tail',
  });

  const roles = new Map([
    [sessionId, 'parent'],
    [child.sessionId, 'child'],
  ]);

  return page.rows.flatMap((row) => {
    if (row.sessionUpdate !== 'session_message') return [];

    const fact: MessageFact = {
      messageId: row.messageId,
      content: row.content,
    };

    const sender = row._meta?.argo?.senderSessionId;

    if (sender) fact.sender = roles.get(sender);

    return [fact];
  });
}

it.each([
  {
    view: "only the parent's outgoing message",
    steps: [
      sessionMessage(undefined, {
        ...fromParent,
        messageId: 'sent',
        content: [text('Check')],
      }),
      sessionMessageChunk(undefined, 'sent', ' the tests'),
    ],
    messages: [],
  },
  {
    view: 'a parent message without a recipient that reuses a child message id',
    steps: [
      sessionMessage(childTranscript, {
        ...fromParent,
        messageId: 'shared',
        content: [text('Check')],
      }),
      sessionMessage(undefined, { messageId: 'shared', content: [text('X')] }),
      sessionMessageChunk(undefined, 'shared', ' and more'),
    ],
    messages: [
      { messageId: 'shared', content: [text('Check')], sender: 'parent' },
    ],
  },
])('never changes the child Feed from $view', async ({ steps, messages }) => {
  expect(await childMessages(steps)).toEqual(messages);
});

it.each([
  {
    view: "the parent's message revised by patch and chunk",
    steps: [
      sessionMessage(childTranscript, {
        ...fromParent,
        messageId: 'received',
        content: [text('Check')],
      }),
      sessionMessage(childTranscript, {
        messageId: 'received',
        content: [text('Check the tests')],
      }),
      sessionMessageChunk(childTranscript, 'received', ' now'),
    ],
    messages: [
      {
        messageId: 'received',
        content: [text('Check the tests'), text(' now')],
        sender: 'parent',
      },
    ],
  },
  {
    view: 'a message without participant ids',
    steps: [
      sessionMessage(childTranscript, {
        messageId: 'bare',
        content: [text('Hi')],
      }),
    ],
    messages: [{ messageId: 'bare', content: [text('Hi')] }],
  },
  {
    view: "the child's reply to its parent",
    steps: [
      sessionMessage(childTranscript, {
        messageId: 'reply',
        senderSessionId: childTranscript,
        recipientSessionId: 'parent',
        content: [text('Done')],
      }),
    ],
    messages: [
      { messageId: 'reply', content: [text('Done')], sender: 'child' },
    ],
  },
])(
  "adds $view on the child's transcript to the child Feed",
  async ({ steps, messages }) => {
    expect(await childMessages(steps)).toEqual(messages);
  },
);
