import { afterEach, expect, it, vi } from 'vitest';
import {
  createActor,
  createMachine,
  fromCallback,
  fromTransition,
} from 'xstate';
import { createMachineLog } from './index';

afterEach(() => {
  vi.useRealTimers();
});

it('writes a timestamped JSON line describing an actor snapshot', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-03T12:00:00.000Z'));
  const lines: string[] = [];
  const actor = createActor(
    createMachine({
      context: { attempts: 2 },
      initial: 'connecting',
      states: { connecting: {} },
    }),
    {
      id: 'connection',
      inspect: createMachineLog({
        enabled: true,
        processName: 'app',
        writeLine: (line) => lines.push(line),
      }),
    },
  ).start();
  actor.stop();

  const line = lines.find(
    (line) => JSON.parse(line).type === '@xstate.snapshot',
  );
  expect(line?.endsWith('\n')).toBe(true);
  expect(line?.split('\n')).toHaveLength(2);
  expect(JSON.parse(line ?? '')).toEqual({
    timestamp: '2026-10-03T12:00:00.000Z',
    processName: 'app',
    actorId: 'connection',
    actorSessionId: actor.sessionId,
    rootId: actor.sessionId,
    type: '@xstate.snapshot',
    eventType: 'xstate.init',
    sourceActorId: null,
    sourceActorSessionId: null,
    value: 'connecting',
    status: 'active',
    context: { attempts: 2 },
  });
});

it('observes invoked children and event sources without noisy inspection events', () => {
  const lines: string[] = [];
  const actor = createActor(
    createMachine({
      invoke: {
        id: 'watchConnection',
        src: fromCallback(({ sendBack }) =>
          sendBack({ type: 'connection.opened' }),
        ),
      },
      entry: () => {},
    }),
    {
      id: 'connection',
      inspect: createMachineLog({
        enabled: true,
        processName: 'app',
        writeLine: (line) => lines.push(line),
      }),
    },
  ).start();
  actor.stop();

  const records = lines.map((line) => JSON.parse(line));
  expect(new Set(records.map((record) => record.type))).toEqual(
    new Set(['@xstate.actor', '@xstate.event', '@xstate.snapshot']),
  );
  expect(records).toContainEqual(
    expect.objectContaining({
      type: '@xstate.actor',
      actorId: 'watchConnection',
      rootId: actor.sessionId,
    }),
  );
  expect(records).toContainEqual(
    expect.objectContaining({
      type: '@xstate.event',
      eventType: 'connection.opened',
      actorId: 'connection',
      sourceActorId: 'watchConnection',
      rootId: actor.sessionId,
    }),
  );
});

it('writes nothing when disabled', () => {
  const writeLine = vi.fn();
  const inspect = createMachineLog({
    enabled: false,
    processName: 'app',
    writeLine,
  });
  const actor = createActor(
    fromTransition((context) => context, {}),
    { inspect },
  ).start();
  actor.send({ type: 'connection.opened' });
  actor.stop();

  expect(inspect).toBeUndefined();
  expect(writeLine).not.toHaveBeenCalled();
});

it('reports a failed log sink once and lets the actor keep running', () => {
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});
  const inspect = createMachineLog({
    enabled: true,
    processName: 'app',
    writeLine: () => {
      throw new Error('disk full');
    },
  });
  const actor = createActor(
    fromTransition((count: number) => count + 1, 0),
    { inspect },
  ).start();
  actor.send({ type: 'increment' });
  actor.send({ type: 'increment' });
  expect(actor.getSnapshot().context).toBe(2);
  actor.stop();
  expect(report).toHaveBeenCalledExactlyOnceWith(
    'machine log (app) disabled after an error:',
    expect.any(Error),
  );
});

it('keeps plain context data while removing outside objects and cycles', () => {
  const other = createActor(fromTransition((context) => context, {}));
  const shared = { retryDelay: 500 };
  const cyclic: Record<string, unknown> = { count: 3 };
  cyclic.self = cyclic;
  const context = {
    attempts: 2,
    nested: { ready: true, missing: undefined, callback: () => {} },
    list: ['first', null, () => {}, 4n],
    shared,
    repeated: shared,
    cyclic,
    actor: other,
    queryClient: new Map(),
    webSocketClient: new EventTarget(),
    notFinite: Number.POSITIVE_INFINITY,
    toJSON: () => {
      throw new Error('Outside serializers must not run');
    },
    get outside() {
      throw new Error('Outside getters must not run');
    },
  };
  const lines: string[] = [];
  const actor = createActor(
    fromTransition((context) => context, context),
    {
      inspect: createMachineLog({
        enabled: true,
        processName: 'app',
        writeLine: (line) => lines.push(line),
      }),
    },
  ).start();
  actor.stop();
  other.stop();

  const snapshot = lines
    .map((line) => JSON.parse(line))
    .find((line) => line.type === '@xstate.snapshot');
  expect(snapshot.context).toEqual({
    attempts: 2,
    nested: { ready: true },
    list: ['first', null, null, null],
    shared: { retryDelay: 500 },
    repeated: { retryDelay: 500 },
    cyclic: { count: 3 },
  });
});
