import {
  describeModel,
  modelTest,
  type DelayEvent,
  type Vertex,
} from '@repo/vitest/model-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor, type Actor, type SnapshotFrom } from 'xstate';
import { events, start } from '#mocks/voice-call-events';
import { modelInput as input, modelMachine } from '#mocks/voice-call-model';
import type { VoiceCallEvent } from './call-types';
import { voiceCallOf } from './call-look';

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
}

const expectNoCall = (snapshot: Snapshot): void =>
  expect(snapshot.context.call).toBeNull();

const expectCall = (snapshot: Snapshot): void =>
  expect(snapshot.context.call?.callId).toBe('call-1');

const expectAnswer = (snapshot: Snapshot): void =>
  expect(snapshot.context.call?.answer).toBe('answer');

const joined = { startedAt: expect.any(String) };

// The call the App is sent in each running state, read from the actor the model drives.
const expectLook =
  (look: Record<string, unknown>) =>
  (): void =>
    expect(voiceCallOf(voice.getSnapshot())).toMatchObject({
      callId: 'call-1',
      ...look,
    });

const notJoined = {
  status: 'connecting',
  connection: 'connecting',
  orb: 'none',
  trouble: null,
  startedAt: null,
};

const model = modelTest(
  modelMachine,
  {
    input,
    fixtures: events,
    vertex,
    stateKey: key,
    eventKey,
    walks: [
      {
        name: 'shortest path',
        search: 'shortest',
        arrival: (_, event, previous): string =>
          `${key(previous)} ${eventKey(event)}`,
      },
    ],
  },
  {
    start: () => {
      voice = createActor(modelMachine, { input }).start();

      return voice;
    },
    executors: Object.fromEntries(
      [...new Set(events.map(({ type }) => type))].map((type) => [
        type,
        ({ event }: { event: VoiceCallEvent | DelayEvent }): void =>
          voice.send(fixtureOf(event)),
      ]),
    ),
    delays: { idle: input.idleMs },
    always: expectVoice,
    states: {
      idle: (snapshot): void => {
        expectNoCall(snapshot);
        expect(voiceCallOf(voice.getSnapshot())).toBeNull();
      },
      running: expectCall,
      'running.starting': expectLook(notJoined),
      'running.connecting': (snapshot): void => {
        expectAnswer(snapshot);
        expectLook(notJoined)();
      },
      'running.connected': expectLook({
        status: 'connected',
        connection: 'connected',
        orb: expect.not.stringMatching(/^none$/),
        trouble: null,
        ...joined,
      }),
      'running.reconnecting': expectLook({
        status: 'connected',
        connection: 'disconnected',
        orb: 'none',
        trouble: 'reconnecting',
        ...joined,
      }),
    },
  },
);

describe('Voice call model', () => {
  describeModel(model);

  it('walks every transition', () => {
    expect(model.unwalked()).toEqual([]);
  });
});

it('does not start a call without a provider', () => {
  const idle = createActor(modelMachine, {
    input: { ...input, provider: null },
  }).start();

  idle.send(start);
  expect(idle.getSnapshot().context).toMatchObject({
    call: null,
    ended: null,
  });
});

it('ignores a second call while one is running', () => {
  const running = createActor(modelMachine, { input }).start();
  running.send(start);
  running.send({ ...start, callId: 'call-2', sessionId: 'session-2' });
  expect(running.getSnapshot().context.call?.callId).toBe('call-1');
});

it('ends only the call an end names', () => {
  const running = createActor(modelMachine, { input }).start();
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
