import type { SessionDiscovery } from '@repo/contracts';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { expect, it } from 'vitest';
import { createActor, fromPromise, type SnapshotFrom } from 'xstate';
import { TestModel, type GraphEventFromLogic } from 'xstate/graph';
import { startAcpEngine } from '#mocks/acp-engine';
import type { DiscoveryOperationInput } from './acp/discovery';
import { discoveryCacheMachine } from './discovery-cache-machine';
import { discoveryMachine } from './discovery-machine';

const key = '["project-1","mock"]';

const discovered = { configOptions: [], commands: [] };

it('graph paths walk every finite discovery completion transition', async () => {
  const host = await startAcpEngine({ steps: [] });

  const input = {
    ...host.openSessions.getSnapshot().context,
    projectId: 'project-1',
    agent: 'mock',
    key,
  };

  const machine = discoveryMachine.provide({
    actors: {
      discover: fromPromise<SessionDiscovery, DiscoveryOperationInput>(
        () => new Promise<SessionDiscovery>(() => {}),
      ),
    },
  });

  const events = [
    {
      type: 'xstate.done.actor.discover',
      actorId: 'discover',
      output: discovered,
    },
    {
      type: 'xstate.error.actor.discover',
      actorId: 'discover',
      error: new Error('Discovery failed'),
    },
  ] satisfies GraphEventFromLogic<typeof machine>[];

  const stateKey = (snapshot: SnapshotFrom<typeof machine>): string =>
    JSON.stringify(snapshot.value);

  const model = new TestModel(machine, {
    input,
    events,
    filterEvents: (snapshot): boolean => snapshot.status === 'active',
  });

  const paths = model.getShortestPaths();

  for (const path of paths) {
    const actor = createActor(machine, { input }).start();

    for (const step of path.steps.slice(1)) {
      actor.send(step.event);
      expect(stateKey(actor.getSnapshot())).toBe(stateKey(step.state));
    }

    actor.stop();
  }

  expect(
    unwalkedTransitions({
      models: [model],
      paths,
      stateKey,
      eventKey: (event): string => event.type,
    }),
  ).toEqual([]);
});

it('graph paths walk cache refresh, shared completion, failure and shutdown transitions', async () => {
  const host = await startAcpEngine({ steps: [] });
  const input = host.openSessions.getSnapshot().context;

  const machine = discoveryCacheMachine.provide({
    actors: {
      discovery: discoveryMachine.provide({
        actors: {
          discover: fromPromise<SessionDiscovery, DiscoveryOperationInput>(
            () => new Promise<SessionDiscovery>(() => {}),
          ),
        },
      }),
    },
  });

  const events = [
    { type: 'discovery.refresh', projectId: 'project-1', agent: 'mock' },
    {
      type: `xstate.done.actor.${key}`,
      actorId: key,
      output: { key, result: discovered, error: null },
    },
    {
      type: `xstate.done.actor.${key}`,
      actorId: key,
      output: { key, result: null, error: new Error('Discovery failed') },
    },
    { type: 'discovery.stop' },
  ] satisfies GraphEventFromLogic<typeof machine>[];

  const stateKey = (snapshot: SnapshotFrom<typeof machine>): string =>
    JSON.stringify({
      value: snapshot.value,
      pending: Object.keys(snapshot.context.pending),
      results: Object.keys(snapshot.context.results),
    });

  const model = new TestModel(machine, {
    input,
    events,
    filterEvents: (snapshot, event): boolean =>
      snapshot.status === 'active' &&
      (!('actorId' in event) || key in snapshot.context.pending),
    serializeState: (snapshot, event, previous): string =>
      JSON.stringify({
        state: stateKey(snapshot),
        via: event && `${previous && stateKey(previous)} ${event.type}`,
      }),
  });

  const paths = model.getShortestPaths();

  for (const path of paths) {
    const actor = createActor(machine, { input }).start();

    for (const step of path.steps.slice(1)) {
      actor.send(step.event);
      expect(stateKey(actor.getSnapshot())).toBe(stateKey(step.state));
    }

    actor.stop();
  }

  expect(
    unwalkedTransitions({
      models: [model],
      paths,
      stateKey,
      eventKey: (event): string => event.type,
    }),
  ).toEqual([]);
});
