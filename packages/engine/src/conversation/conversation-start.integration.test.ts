import { expect, it } from 'vitest';
import { createActor, type Actor } from 'xstate';
import { start } from '#mocks/conversation-events';
import { modelMachine, voiceModelInput } from '#mocks/conversation-model';
import type { ConversationInput } from './conversation-types';

const conversationWith = (
  input: Partial<ConversationInput> = {},
): Actor<typeof modelMachine> =>
  createActor(modelMachine, {
    input: { ...voiceModelInput(), ...input },
  }).start();

// Starting and ending the one call a Server runs, with data the model's fixtures do not vary.
it.each([
  ['no Conversation provider is configured', { provider: null }, 'no-provider'],
  [
    'its Session is not open',
    { sessionOpen: (): boolean => false },
    'session-not-open',
  ],
] as const)('refuses a start when %s, saying so', (_, input, refusal): void => {
  const voice = conversationWith(input);

  voice.send(start);
  expect(voice.getSnapshot().context).toMatchObject({
    call: null,
    refused: { conversationId: 'call-1', refusal },
  });
});

it('refuses a second call while one is running, saying so', () => {
  const running = conversationWith();

  running.send(start);
  running.send({ ...start, conversationId: 'call-2', sessionId: 'session-2' });
  expect(running.getSnapshot().context).toMatchObject({
    call: { conversationId: 'call-1' },
    refused: { conversationId: 'call-2', refusal: 'call-running' },
  });
});

it('forgets a refusal once a call begins', () => {
  const voice = conversationWith();
  voice.send(start);
  voice.send({ ...start, conversationId: 'call-2' });
  voice.send({ type: 'call.end', reason: 'person' });

  voice.send({ ...start, conversationId: 'call-3' });
  expect(voice.getSnapshot().context).toMatchObject({
    call: { conversationId: 'call-3' },
    refused: null,
  });
});

it('ends only the call an end names', () => {
  const running = conversationWith();

  running.send(start);
  running.send({ type: 'call.end', reason: 'agent', sessionId: 'session-2' });
  expect(running.getSnapshot().context.call?.conversationId).toBe('call-1');
  running.send({ type: 'call.end', reason: 'agent', sessionId: 'session-1' });
  expect(running.getSnapshot().context.ended).toEqual({
    conversationId: 'call-1',
    sessionId: 'session-1',
    reason: 'agent',
  });
});
