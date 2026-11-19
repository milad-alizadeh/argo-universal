import type { VoiceCall } from '@repo/contracts';
import {
  describeModel,
  modelTest,
  type DelayEvent,
  type Vertex,
} from '@repo/vitest/model-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor, type Actor, type SnapshotFrom } from 'xstate';
import { events } from '#mocks/voice-call-events';
import {
  modelMachine,
  voiceModelIdleMs,
  voiceModelInput,
} from '#mocks/voice-call-model';
import { voiceCallOf } from './call-look';
import type { VoiceCallEvent } from './call-types';

type Snapshot = SnapshotFrom<typeof modelMachine>;

// How a call ended is checked on the actor after each step, so a restart after any ending is one edge.
const vertex = (snapshot: Snapshot): Vertex => ({ state: snapshot.value });

const key = (snapshot: Snapshot): string => JSON.stringify(vertex(snapshot));

type StepEvent = VoiceCallEvent | DelayEvent;

const eventKey = (event: StepEvent): string => JSON.stringify(event);

// The step's own fixture: events of one type differ in their data.
const fixtureOf = (event: VoiceCallEvent | DelayEvent): VoiceCallEvent =>
  events.find((fixture) => eventKey(fixture) === eventKey(event)) ??
  expect.unreachable(`${event.type} is not a fixture`);

let voice: Actor<typeof modelMachine>;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  voice?.stop();
  vi.useRealTimers();
});

function expectVoice(expected: Snapshot): void {
  expect(voice.getSnapshot().value).toEqual(expected.value);
  expect(voice.getSnapshot().context.ended).toEqual(expected.context.ended);
  expect(voice.getSnapshot().context.refused).toEqual(expected.context.refused);
}

// A start sent while the call runs is refused, and the running call goes on.
const expectRefusedWhileRunning = (snapshot: Snapshot): void => {
  expectCall(snapshot);
  expect(snapshot.context.refused).toBeOneOf([
    null,
    { callId: 'call-1', refusal: 'call-running' },
  ]);
};

const expectNoCall = (snapshot: Snapshot): void =>
  expect(snapshot.context.call).toBeNull();

const expectCall = (snapshot: Snapshot): void =>
  expect(snapshot.context.call?.callId).toBe('call-1');

const expectAnswer = (snapshot: Snapshot): void =>
  expect(snapshot.context.call?.answer).toBe('answer');

const joined: Partial<VoiceCall> = { startedAt: expect.any(String) };

// Only a reconnecting call says so; elsewhere the walk may have blocked the microphone.
const notReconnecting = expect.toBeOneOf([null, 'microphone-blocked']);

// The call the App is sent in each running state, read from the actor the model drives; `expectVoice` has already shown that actor is in the step's state.
const expectLook = (look: Partial<VoiceCall>) => (): void =>
  expect(voiceCallOf(voice.getSnapshot())).toMatchObject({
    callId: 'call-1',
    ...look,
  });

const notJoined: Partial<VoiceCall> = {
  status: 'connecting',
  orb: 'none',
  trouble: notReconnecting,
  startedAt: null,
};

// A connected call shows what is happening on it; which of the three depends on who speaks and works.
const live: Partial<VoiceCall> = {
  status: 'connected',
  orb: expect.stringMatching(/^(listening|talking|thinking)$/),
  ...joined,
};

// A connected call's only trouble is a microphone the walk blocked.
const expectConnected = (): void => {
  const { call } = voice.getSnapshot().context;
  expectLook({
    ...live,
    trouble: call?.microphoneBlocked ? 'microphone-blocked' : null,
  })();
};

const reconnecting: Partial<VoiceCall> = {
  status: 'connected',
  orb: 'none',
  trouble: 'reconnecting',
  ...joined,
};

const expectIdle = (snapshot: Snapshot): void => {
  expectNoCall(snapshot);
  expect(voiceCallOf(voice.getSnapshot())).toBeNull();
};

const expectConnecting = (snapshot: Snapshot): void => {
  expectAnswer(snapshot);
  expectLook(notJoined)();
};

// The walk tells states apart by value alone, so it attaches Sessions only before any call ended, where the ending it checks cannot differ.
const attachesOnce = (snapshot: Snapshot, event: StepEvent): boolean =>
  event.type !== 'sessions.attach' || snapshot.context.ended === null;

const model = modelTest(
  modelMachine,
  {
    input: voiceModelInput(),
    fixtures: events,
    vertex,
    stateKey: key,
    eventKey,
    walks: [
      {
        name: 'shortest path',
        search: 'shortest',
        permits: attachesOnce,
        arrival: (_, event, previous): string =>
          `${key(previous)} ${eventKey(event)}`,
      },
    ],
  },
  {
    start: () => {
      voice = createActor(modelMachine, { input: voiceModelInput() }).start();

      return voice;
    },
    executors: Object.fromEntries(
      [...new Set(events.map(({ type }) => type))].map((type) => [
        type,
        ({ event }: { event: VoiceCallEvent | DelayEvent }): void =>
          voice.send(fixtureOf(event)),
      ]),
    ),
    delays: { idle: voiceModelIdleMs },
    always: expectVoice,
    states: {
      idle: expectIdle,
      running: expectRefusedWhileRunning,
      'running.starting': expectLook(notJoined),
      'running.connecting': expectConnecting,
      'running.connected': expectConnected,
      'running.reconnecting': expectLook(reconnecting),
    },
  },
);

describe('Voice call model', () => {
  describeModel(model);

  it('walks every transition', () => {
    expect(model.unwalked()).toEqual([]);
  });
});
