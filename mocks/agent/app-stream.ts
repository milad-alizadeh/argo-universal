import type { AgentCommandOf, FeedUpdate } from '@repo/agents';
import type { MockAgentStream, MockAgentStreamEvent } from './adapter';
import type { AppFixtureOptions } from './app-fixtures';

export const sharedReply = 'The shared fixture completed this Turn.';
export const imageReply = 'The dominant color is red.';

const replyTemplate = {
  sessionUpdate: 'agent_message',
  state: 'settled',
} as const;

function replyUpdate(id: string, text: string): FeedUpdate {
  return {
    ...replyTemplate,
    id,
    messageId: id,
    content: [{ type: 'text', text }],
  };
}

function replyEvent(
  command: AgentCommandOf<'agent.prompt'>,
  text: string,
): MockAgentStreamEvent {
  return {
    type: 'agent.feed',
    change: {
      type: 'upsert',
      update: replyUpdate(`reply-${command.turnId}`, text),
    },
  };
}

function prompt(
  stream: MockAgentStream,
  command: AgentCommandOf<'agent.prompt'>,
  scenario: AppFixtureOptions['scenario'],
): void {
  stream.send({ type: 'agent.turnStarted' });
  stream.send(
    replyEvent(command, scenario === 'image' ? imageReply : sharedReply),
  );
  stream.send({ type: 'agent.turnEnded', stopReason: 'end_turn' });
}

export function appFixtureStream(
  stream: MockAgentStream,
  scenario: AppFixtureOptions['scenario'],
): undefined {
  stream.receive((command): void => {
    if (command.type === 'agent.prompt') prompt(stream, command, scenario);
    if (command.type === 'agent.cancel')
      stream.send({ type: 'agent.turnEnded', stopReason: 'cancelled' });
  });
  return undefined;
}
