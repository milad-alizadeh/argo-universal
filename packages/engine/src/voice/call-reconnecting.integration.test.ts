import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor, type Actor } from 'xstate';
import { start } from '#mocks/voice-call-events';
import { modelInput, modelMachine } from '#mocks/voice-call-model';
import { providerEvent } from './call-types';
import { voiceCallOf } from './call-look';

const { idleMs } = modelInput;

const connected = providerEvent({ type: 'status', status: 'connected' });

const disconnected = providerEvent({ type: 'status', status: 'disconnected' });

let voice: Actor<typeof modelMachine>;

beforeEach(() => {
  vi.useFakeTimers();
  voice = createActor(modelMachine, { input: modelInput }).start();
  voice.send(start);
  voice.send({ type: 'call.answered', answer: 'answer' });
});

afterEach(() => {
  voice.stop();
  vi.useRealTimers();
});

const callNow = (): ReturnType<typeof voiceCallOf> =>
  voiceCallOf(voice.getSnapshot());

describe('a Voice call whose connection drops', () => {
  it('is reconnecting, and says so without contradicting itself', () => {
    voice.send(connected);
    voice.send(disconnected);

    expect(voice.getSnapshot().matches({ running: 'reconnecting' })).toBe(
      true,
    );
    expect(callNow()).toEqual({
      callId: 'call-1',
      sessionId: 'session-1',
      status: 'connected',
      connection: 'disconnected',
      orb: 'none',
      trouble: 'reconnecting',
      startedAt: expect.any(String),
    });
  });

  it('does not end for idleness while it reconnects', () => {
    voice.send(connected);
    voice.send(disconnected);
    vi.advanceTimersByTime(idleMs * 2);

    expect(voice.getSnapshot().context.ended).toBeNull();
  });

  it('starts the idle period over once it is back', () => {
    voice.send(connected);
    vi.advanceTimersByTime(idleMs - 1);
    voice.send(disconnected);
    voice.send(connected);
    vi.advanceTimersByTime(idleMs - 1);
    expect(voice.getSnapshot().context.ended).toBeNull();

    vi.advanceTimersByTime(1);
    expect(voice.getSnapshot().context.ended).toMatchObject({
      reason: 'idle',
    });
  });

  it('keeps its first start time through reconnecting', () => {
    voice.send(connected);
    const { startedAt } = callNow() ?? {};
    vi.advanceTimersByTime(1000);
    voice.send(disconnected);
    voice.send(connected);

    expect(callNow()).toMatchObject({ status: 'connected', startedAt });
  });

  it('is still connecting when the link drops before the call joined', () => {
    voice.send(disconnected);

    expect(callNow()).toMatchObject({
      status: 'connecting',
      connection: 'connecting',
      orb: 'none',
      trouble: null,
      startedAt: null,
    });
  });
});
