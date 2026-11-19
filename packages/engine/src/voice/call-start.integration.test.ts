import { expect, it } from 'vitest';
import { createActor } from 'xstate';
import { start } from '#mocks/voice-call-events';
import { modelMachine, voiceModelInput } from '#mocks/voice-call-model';

// Starting and ending the one call a Server runs, with data the model's fixtures do not vary.
it('does not start a call without a provider', () => {
  const idle = createActor(modelMachine, {
    input: { ...voiceModelInput(), provider: null },
  }).start();

  idle.send(start);
  expect(idle.getSnapshot().context).toMatchObject({
    call: null,
    ended: null,
  });
});

it('ignores a second call while one is running', () => {
  const running = createActor(modelMachine, {
    input: voiceModelInput(),
  }).start();

  running.send(start);
  running.send({ ...start, callId: 'call-2', sessionId: 'session-2' });
  expect(running.getSnapshot().context.call?.callId).toBe('call-1');
});

it('ends only the call an end names', () => {
  const running = createActor(modelMachine, {
    input: voiceModelInput(),
  }).start();

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
