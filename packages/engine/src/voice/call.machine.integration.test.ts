import {
  describeModel,
  modelTest,
  type DelayEvent,
  type Vertex,
} from '@repo/vitest/model-test';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createActor,
  fromCallback,
  type Actor,
  type SnapshotFrom,
} from 'xstate';
import {
  providerEvent,
  type VoiceCallEvent,
  type VoiceCallInput,
} from './call-types';
import { type ConnectionWatch, type SessionWatch } from './call-watchers';
import { voiceCallMachine } from './call.machine';
import { FakeVoiceProvider } from './fake-provider';
import type { ProviderCallInput } from './provider-call';

const stub = <Input>(): ReturnType<
  typeof fromCallback<VoiceCallEvent, Input>
> => fromCallback<VoiceCallEvent, Input>((): (() => void) => (): void => {});

// The model drives every event itself, so the actors that would send them back are stubs.
const modelMachine = voiceCallMachine.provide({
  actors: {
    providerCall: stub<ProviderCallInput>(),
    watchSession: stub<SessionWatch>(),
    watchConnection: stub<ConnectionWatch>(),
  },
});

type Snapshot = SnapshotFrom<typeof modelMachine>;

const input: VoiceCallInput = {
  provider: new FakeVoiceProvider(),
  briefing: () => '',
  idleMs: 60_000,
};

const start: VoiceCallEvent = {
  type: 'call.start',
  callId: 'call-1',
  sessionId: 'session-1',
  offer: 'offer',
};

const events: VoiceCallEvent[] = [
  start,
  { type: 'call.answered', answer: 'answer' },
  { type: 'call.end', reason: 'person' },
  { type: 'call.failed', message: 'no' },
  { type: 'call.sessionGone', reason: 'session-closed' },
  { type: 'call.sessionGone', reason: 'session-archived' },
  { type: 'call.appDisconnected' },
  { type: 'voice.say', say: { kind: 'tell', text: 'Done', delivery: 'speak' } },
  providerEvent({ type: 'status', status: 'connected' }),
  providerEvent({ type: 'status', status: 'error' }),
  providerEvent({ type: 'closed', reason: 'ended' }),
];

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

afterEach(() => voice?.stop());

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
    delays: {},
    always: expectVoice,
    states: {
      idle: expectNoCall,
      running: expectCall,
      'running.connecting': expectAnswer,
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
