import { expect, it } from 'vitest';
import { SuggestionConversation } from './conversation';

const said = (
  conversation: SuggestionConversation,
  messageId: string,
  text: string,
): void => {
  conversation.observe({
    sessionId: 'session-1',
    update: {
      sessionUpdate: 'agent_message_chunk',
      messageId,
      content: { type: 'text', text },
    },
  });
};

it('gives the prediction model the Agent messages of a Conversation without their marks', () => {
  const conversation = new SuggestionConversation();

  conversation.begin({
    turnId: 'turn-1',
    content: [{ type: 'text', text: 'Run the tests' }],
  });
  said(conversation, 'first', '[STA');
  said(conversation, 'first', 'TUS] Running the suite. ');
  said(conversation, 'second', '[COMPLETE] All green');

  expect(conversation.read()).toBe(
    '\nUSER: "Run the tests"\nASSISTANT: Running the suite. All green',
  );
});
