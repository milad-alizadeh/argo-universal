import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { createActor, fromPromise, toPromise } from 'xstate';
import { coreOnlyHooks } from '#mocks/core-hooks';
import { openTestDatabase } from '#mocks/database';
import { unlaunchedInstalledAgents } from '#mocks/installed-agents';
import { unstartedWriter } from '#mocks/unstarted-writer';
import { createAcpResources } from '../agents';
import type { SessionData, SessionInput } from './session-data';
import { sessionMachine, type SessionMachineInput } from './session-machine';
import { routeSubagentNotification } from './subagent-routing';

const { database, directory, remove } = openTestDatabase();

afterAll(remove);

const data: SessionData = {
  sessionId: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  vendorSessionId: null,
  checkout: { path: '/project', branch: null },
  configValues: [],
  heldConfig: [],
  epoch: 0,
  maxRevision: 0,
  activityAt: 0,
  nextPosition: 0,
  kept: false,
  undisclosedInterruptedTurnId: null,
};

const dependencies = (
  input: SessionInput,
): SessionInput & Omit<SessionMachineInput, keyof SessionInput | 'writer'> => ({
  ...input,
  now: (): number => Date.now(),
  createId: randomUUID,
  hooks: coreOnlyHooks,
  acp: {
    resources: createAcpResources(),
    installedAgents: unlaunchedInstalledAgents(database, directory),
  },
});

it('a Session loads through the writer it was given, with no writer registered in its system', async (): Promise<void> => {
  const writer = unstartedWriter(database);
  const loaded = Promise.withResolvers<unknown>();

  const session = createActor(
    sessionMachine.provide({
      actors: {
        loadSession: fromPromise(({ input }) => {
          loaded.resolve(input.writer);

          return new Promise<SessionData>(() => {});
        }),
      },
    }),
    {
      input: {
        ...dependencies({
          kind: 'existing',
          database,
          runtimeDirectory: directory,
          sessionId: 'session-1',
        }),
        writer,
      },
    },
  ).start();

  expect(session.system.get('databaseWriter')).toBeUndefined();
  await expect(loaded.promise).resolves.toBe(writer);
  session.stop();
});

it('a new Session whose Agent cannot open discards through the writer it was given', async (): Promise<void> => {
  const writer = unstartedWriter(database);
  const discarded = Promise.withResolvers<unknown>();

  const session = createActor(
    sessionMachine.provide({
      actors: {
        createCheckout: fromPromise(() => Promise.resolve(data)),
        discardSession: fromPromise(({ input }) => {
          discarded.resolve(input.writer);

          return Promise.resolve();
        }),
      },
    }),
    {
      input: {
        ...dependencies({
          kind: 'new',
          database,
          runtimeDirectory: directory,
          sessionId: 'session-1',
          projectId: 'project-1',
          projectPath: '/project',
          agent: 'mock',
          checkout: { type: 'main' },
          configOptions: [],
          prompt: [{ type: 'text', text: 'Build it' }],
          turnId: 'turn-1',
        }),
        writer,
      },
    },
  ).start();

  await expect(discarded.promise).resolves.toBe(writer);
  await toPromise(session);
});

it('fails loudly instead of dropping a Subagent update when the Session has no Feed', (): void => {
  const { context } = createActor(sessionMachine, {
    input: {
      ...dependencies({
        kind: 'existing',
        database,
        runtimeDirectory: directory,
        sessionId: 'session-1',
      }),
      writer: unstartedWriter(database),
    },
  }).getSnapshot();

  expect(() =>
    routeSubagentNotification({
      context,
      notification: {
        sessionId: 'vendor-session',
        update: { sessionUpdate: 'subagent_update', sessionId: 'subagent-1' },
      },
      parentFeed: undefined,
      spawn: () => {
        throw new Error('No Subagent Feed should start');
      },
      storageFailing: () => {},
    }),
  ).toThrow('Session session-1 has no Feed to route a Subagent update to');
});
