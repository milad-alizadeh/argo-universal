import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor, type Actor } from 'xstate';
import { start } from '#mocks/voice-call-events';
import {
  modelMachine,
  voiceModelIdleMs as idleMs,
  voiceModelInput,
} from '#mocks/voice-call-model';
import { voiceCallOf } from './call-look';
import { providerEvent, type VoiceCallEvent } from './call-types';

const connected = providerEvent({ type: 'status', status: 'connected' });

const disconnected = providerEvent({ type: 'status', status: 'disconnected' });

let voice: Actor<typeof modelMachine>;

beforeEach(() => {
  vi.useFakeTimers();
  voice = createActor(modelMachine, { input: voiceModelInput() }).start();
  voice.send(start);
  voice.send({ type: 'call.answered', answer: 'answer', canLook: false });
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

    expect(voice.getSnapshot().matches({ running: 'reconnecting' })).toBe(true);
    expect(callNow()).toEqual({
      callId: 'call-1',
      sessionId: 'session-1',
      status: 'connected',
      orb: 'none',
      trouble: 'reconnecting',
      startedAt: expect.any(String),
    });
  });

  it('does not end for idleness while it reconnects', () => {
    voice.send(connected);
    voice.send(disconnected);
    vi.advanceTimersByTime(idleMs * 2);

    expect(voice.getSnapshot().matches({ running: 'reconnecting' })).toBe(true);
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

    expect(voice.getSnapshot().matches({ running: 'connecting' })).toBe(true);
    expect(callNow()).toMatchObject({
      status: 'connecting',
      orb: 'none',
      trouble: null,
      startedAt: null,
    });
    voice.send(connected);
    expect(voice.getSnapshot().matches({ running: 'connected' })).toBe(true);
    expect(callNow()).toMatchObject({ startedAt: expect.any(String) });
  });
});

const endings: [string, VoiceCallEvent, string][] = [
  ['the person', { type: 'call.end', reason: 'person' }, 'person'],
  [
    'a provider error',
    providerEvent({ type: 'status', status: 'error' }),
    'failed',
  ],
  [
    'its Session closing',
    { type: 'call.sessionGone', reason: 'session-closed' },
    'session-closed',
  ],
];

describe('a reconnecting Voice call', () => {
  it.each(endings)('ends by %s', (_, ending, reason) => {
    voice.send(connected);
    voice.send(disconnected);
    voice.send(ending);

    expect(voice.getSnapshot().matches('idle')).toBe(true);
    expect(voice.getSnapshot().context.ended).toEqual({
      callId: 'call-1',
      sessionId: 'session-1',
      reason,
    });
  });

  it('records why a provider error ended it', () => {
    voice.send(connected);
    voice.send(disconnected);
    voice.send(providerEvent({ type: 'status', status: 'error' }));

    expect(voice.getSnapshot().context.failure).toBe(
      'The connection to the voice failed.',
    );
  });
});
