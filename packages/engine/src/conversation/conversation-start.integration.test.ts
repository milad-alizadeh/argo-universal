import { expect, it } from 'vitest';
import { createActor, type Actor } from 'xstate';
import { start } from '#mocks/conversation-events';
import { modelMachine, voiceModelInput } from '#mocks/conversation-model';
import type { VoiceCallInput } from './conversation-types';

const voiceWith = (
  input: Partial<VoiceCallInput> = {},
): Actor<typeof modelMachine> =>
  createActor(modelMachine, {
    input: { ...voiceModelInput(), ...input },
  }).start();

// Starting and ending the one call a Server runs, with data the model's fixtures do not vary.
it.each([
  ['no Voice provider is configured', { provider: null }, 'no-provider'],
  [
    'its Session is not open',
    { sessionOpen: (): boolean => false },
    'session-not-open',
  ],
] as const)('refuses a start when %s, saying so', (_, input, refusal): void => {
  const voice = voiceWith(input);

  voice.send(start);
  expect(voice.getSnapshot().context).toMatchObject({
    call: null,
    refused: { callId: 'call-1', refusal },
  });
});

it('refuses a second call while one is running, saying so', () => {
  const running = voiceWith();

  running.send(start);
  running.send({ ...start, callId: 'call-2', sessionId: 'session-2' });
  expect(running.getSnapshot().context).toMatchObject({
    call: { callId: 'call-1' },
    refused: { callId: 'call-2', refusal: 'call-running' },
  });
});

it('forgets a refusal once a call begins', () => {
  const voice = voiceWith();
  voice.send(start);
  voice.send({ ...start, callId: 'call-2' });
  voice.send({ type: 'call.end', reason: 'person' });

  voice.send({ ...start, callId: 'call-3' });
  expect(voice.getSnapshot().context).toMatchObject({
    call: { callId: 'call-3' },
    refused: null,
  });
});

it('ends only the call an end names', () => {
  const running = voiceWith();

  running.send(start);
  running.send({ type: 'call.end', reason: 'agent', sessionId: 'session-2' });
  expect(running.getSnapshot().context.call?.callId).toBe('call-1');
  running.send({ type: 'call.end', reason: 'agent', sessionId: 'session-1' });
  expect(running.getSnapshot().context.ended).toEqual({
    callId: 'call-1',
    sessionId: 'session-1',
    reason: 'agent',
  });
});
