import { randomUUID } from 'node:crypto';
import type { DelayEvent, Vertex } from '@repo/vitest/model-test';
import { createActor, type EventFromLogic, type SnapshotFrom } from 'xstate';
import { seedAgentFixtures } from '#mocks/agent-fixtures';
import { coreOnlyHooks } from '#mocks/core-hooks';
import { openTestDatabase } from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { createOpenSessionsModelMachine } from '#mocks/open-sessions';
import { unstartedWriter } from '#mocks/unstarted-writer';
import { createAcpResources } from '../agents';
import type { OpenSessionsInput } from './open-sessions-machine';
import { sessionMachine } from './session-machine';

export const openSessionsModelMachine = createOpenSessionsModelMachine(false);

export const openSessionsGraphMachine = createOpenSessionsModelMachine(true);

const { database, directory: runtimeDirectory, remove } = openTestDatabase();

export { remove };

seedAgentFixtures(database, [{ agent: 'mock', label: 'mock', logo: '' }]);

export const input: OpenSessionsInput = {
  now: (): number => Date.now(),
  createId: randomUUID,
  hooks: coreOnlyHooks,
  database,
  runtimeDirectory,
  acpResources: createAcpResources(),
  installedAgents: unlaunchedInstalledAgents(database, runtimeDirectory),
  writer: unstartedWriter(database),
};

// Two ids exercise duplicate opens, removal with another Session left, and the last Session stopping.
export type OpenSessionsEvent = EventFromLogic<typeof openSessionsModelMachine>;

export const events: OpenSessionsEvent[] = [
  ...['one', 'two'].flatMap((sessionId): OpenSessionsEvent[] => [
    {
      type: 'sessions.create',
      sessionId,
      projectId: 'project-1',
      projectPath: '/project',
      agent: 'mock',
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Build it' }],
      turnId: `turn-${sessionId}`,
    },
    { type: 'sessions.open', sessionId, agent: 'mock' },
    { type: 'sessions.archive', sessionId, agent: 'mock' },
    {
      type: `xstate.done.actor.session:${sessionId}`,
      actorId: `session:${sessionId}`,
      output: { failure: null },
    },
    {
      type: `xstate.error.actor.session:${sessionId}`,
      actorId: `session:${sessionId}`,
      error: new Error('Session actor failed'),
    },
    {
      type: `xstate.snapshot.session:${sessionId}`,
      snapshot: createActor(sessionMachine, {
        input: {
          now: (): number => Date.now(),
          createId: randomUUID,
          hooks: coreOnlyHooks,
          kind: 'existing',
          database,
          runtimeDirectory,
          acp: {
            resources: input.acpResources,
            installedAgents: input.installedAgents,
          },
          writer: input.writer,
          sessionId,
        },
      }).getSnapshot(),
    },
  ]),
  { type: 'sessions.stopAll' },
  {
    type: 'xstate.error.actor.unrelated:worker',
    actorId: 'unrelated:worker',
    error: new Error('Unexpected actor failure'),
  },
];

export type OpenSessionsSnapshot = SnapshotFrom<
  typeof openSessionsModelMachine
>;

// One pair of Sessions covers the branches; repeating an id adds no new lifecycle behavior.
export const actorBelongsToModel = (
  snapshot: OpenSessionsSnapshot,
  event: OpenSessionsEvent | DelayEvent,
): boolean => {
  if (!('actorId' in event)) return true;

  if (event.actorId === 'unrelated:worker') return true;

  return Object.values(snapshot.context.sessions).some(
    (session) => session.id === event.actorId,
  );
};

export const vertex = (snapshot: OpenSessionsSnapshot): Vertex => ({
  value: snapshot.value,
  sessions: Object.keys(snapshot.context.sessions).sort(),
});

export const key = (snapshot: OpenSessionsSnapshot): string =>
  JSON.stringify(vertex(snapshot));
