import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appRouter } from '@repo/api';
import {
  createMockAdapter,
  type MockAgentScript,
  type MockAgentStream,
  mockReady,
} from '@repo/mocks/agent';
import { afterEach, expect, it } from 'vitest';
import { createActor, setup, waitFor } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import { writerMachine } from '../feed/writer-machine';
import { createServerServices } from '../server-services';
import { registryMachine } from './registry-machine';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function openServer({ applyConfigOptions = true } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'session-service-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', directory]);
  const { database, remove } = openTestDatabase({}, directory);
  cleanups.push(remove);
  const configOptions = [
    {
      configId: 'model',
      name: 'Model',
      type: 'select' as const,
      currentValue: 'small',
      options: [
        { value: 'small', name: 'Small' },
        { value: 'large', name: 'Large' },
      ],
    },
  ];
  const streams = new Map<string, MockAgentStream>();
  const ready = { ...mockReady, configOptions };
  const script: MockAgentScript = {
    connect: async () => ready,
    stream: (stream) => {
      streams.set(stream.input.sessionId, stream);
      stream.receive((command) => {
        if (command.type === 'agent.cancel')
          stream.send({ type: 'agent.turnEnded', stopReason: 'cancelled' });
        if (command.type === 'agent.setConfigOption' && applyConfigOptions)
          queueMicrotask(() =>
            stream.send({
              type: 'agent.configOptionsChanged',
              configOptions: configOptions.map((option) => ({
                ...option,
                currentValue: command.value as string,
              })),
            }),
          );
      });
    },
  };
  const root = createActor(
    setup({
      actors: { sessions: registryMachine, writer: writerMachine },
    }).createMachine({
      invoke: [
        { src: 'writer', systemId: 'databaseWriter', input: { database } },
        {
          src: 'sessions',
          systemId: 'sessions',
          input: {
            database,
            adapters: [
              createMockAdapter(script),
              createMockAdapter(
                {
                  ...script,
                  connect: async () => ({
                    ...ready,
                    configOptions: configOptions.map((option) => ({
                      ...option,
                      currentValue: 'large',
                    })),
                    capabilities: {
                      planApproval: 'startTurn',
                      stopShell: true,
                    },
                  }),
                },
                'alternate',
              ),
            ],
          },
        },
      ],
    }),
  ).start();
  cleanups.push(() => root.stop());
  const sessions = root.system.get('sessions');
  const services = createServerServices({
    database,
    sessions,
    version: '1',
    startedAt: new Date().toISOString(),
  });
  const caller = appRouter.createCaller({ services });
  return { caller, root, streams, configOptions, services, database };
}

it.each([
  ['mock', 'small'],
  ['alternate', 'large'],
])(
  'creates a Session with registered Agent %s and returns its config options',
  async (agent, currentValue) => {
    const { caller } = openServer();
    const result = await caller.session.new({
      projectId: 'project-1',
      agent,
      checkout: 'main',
    });
    expect(result).toEqual({
      sessionId: expect.any(String),
      configOptions: [
        expect.objectContaining({ configId: 'model', currentValue }),
      ],
    });
    expect(
      await caller.feed.page({
        sessionId: result.sessionId,
        direction: 'tail',
      }),
    ).toMatchObject({ rows: [] });
  },
);

it('returns after dispatching a config choice and delivers later changes through the Feed', async () => {
  const { caller, streams, configOptions, services } = openServer({
    applyConfigOptions: false,
  });
  const { sessionId } = await caller.session.new({
    projectId: 'project-1',
    agent: 'mock',
    checkout: 'main',
  });
  const controller = new AbortController();
  cleanups.push(() => controller.abort());
  const updates = services.feed.subscribe(
    { sessionId, after: null },
    controller.signal,
  );
  const iterator = updates[Symbol.asyncIterator]();
  await iterator.next();
  expect(
    await caller.session.setConfigOption({
      sessionId,
      configId: 'model',
      type: 'id',
      value: 'large',
    }),
  ).toMatchObject({
    configOptions: [{ configId: 'model', currentValue: 'small' }],
  });
  const stream = streams.get(sessionId);
  stream?.send({
    type: 'agent.configOptionsChanged',
    configOptions: configOptions.map((option) => ({
      ...option,
      name: 'Renamed',
    })),
  });
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ name: 'Renamed', currentValue: 'small' }] },
  });
  stream?.send({
    type: 'agent.configOptionsChanged',
    configOptions: configOptions.map((option) => ({
      ...option,
      currentValue: 'large',
    })),
  });
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ currentValue: 'large' }] },
  });
  controller.abort();
  await iterator.return?.();
}, 1000);

it('prompts and cancels through tRPC, with the same Session reopened only once', async () => {
  const { caller, streams } = openServer();
  const { messageId } = await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Hello' }],
  });
  const stream = streams.get('session-1');
  expect(
    await caller.feed.row({ sessionId: 'session-1', id: messageId }),
  ).toMatchObject({ content: [{ type: 'text', text: 'Hello' }] });
  await expect(
    caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Again' }],
    }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: expect.stringContaining('running'),
  });
  expect(await caller.session.cancel({ sessionId: 'session-1' })).toEqual({});
  const next = await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'After cancel' }],
  });
  expect(next.messageId).not.toBe(messageId);
  expect(streams.get('session-1')).toBe(stream);
});

it('rejects unknown Sessions and input that breaks the contract', async () => {
  const { caller } = openServer();
  await expect(
    caller.session.prompt({
      sessionId: 'missing',
      prompt: [{ type: 'text', text: 'Hello' }],
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(
    caller.session.prompt({ sessionId: 'session-1', prompt: [] }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  await expect(
    caller.session.new({
      projectId: 'project-1',
      agent: 'unregistered',
      checkout: 'main',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('opens a stored Session when its Feed is subscribed, and sends its live config options', async () => {
  const { services } = openServer();
  const controller = new AbortController();
  cleanups.push(() => controller.abort());
  const caller = appRouter.createCaller(
    { services },
    { signal: controller.signal },
  );
  const updates = await caller.feed.subscribe({
    sessionId: 'session-1',
    after: null,
  });
  const iterator = updates[Symbol.asyncIterator]();
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ configId: 'model', currentValue: 'small' }] },
  });
  controller.abort();
  await iterator.return?.();
});

it('removes a closed Session and resumes it with the stored Agent identity on the next prompt', async () => {
  const { caller, root, streams } = openServer();
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'First' }],
  });
  await caller.session.cancel({ sessionId: 'session-1' });
  const first = root.system.get('session:session-1');
  first.send({ type: 'session.close' });
  await waitFor(first, (snapshot) => snapshot.status === 'done');
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Resume' }],
  });
  expect(streams.get('session-1')?.input.vendorSessionId).toBe('vendor-1');
  expect(root.system.get('session:session-1')).not.toBe(first);
});

it('finishes stopping when a Session is still creating, and fails the pending creation call', async () => {
  const { caller, root } = openServer();
  const sessions = root.system.get('sessions');
  const result = expect(
    caller.session.new({
      projectId: 'project-1',
      agent: 'mock',
      checkout: 'main',
    }),
  ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  await waitFor(
    sessions,
    (snapshot) => Object.keys(snapshot.context.sessions).length > 0,
  );
  sessions.send({ type: 'sessions.stopAll' });
  await waitFor(sessions, (snapshot) => snapshot.status === 'done');
  await result;
});

it('refuses commands for a Subagent while keeping its stored Feed readable', async () => {
  const { caller, root, database } = openServer();
  insertSession(database, { id: 'subagent', parentSessionId: 'session-1' });
  await expect(
    caller.session.cancel({ sessionId: 'subagent' }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'A Subagent is read-only',
  });
  expect(
    await caller.feed.page({ sessionId: 'subagent', direction: 'tail' }),
  ).toMatchObject({ rows: [] });
  expect(root.system.get('session:subagent')).toBeUndefined();
});

it('rejects config choices that the Agent did not offer', async () => {
  const { caller } = openServer();
  await expect(
    caller.session.setConfigOption({
      sessionId: 'session-1',
      configId: 'model',
      type: 'id',
      value: 'missing',
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
