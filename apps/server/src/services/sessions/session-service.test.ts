import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentProbe, VendorCommand } from '@repo/agents';
import { appRouter } from '@repo/api';
import type { SessionNewInput } from '@repo/contracts';
import { turn } from '@repo/db/schema';
import {
  createMockAdapter,
  type MockAgentScript,
  type MockAgentStream,
  mockReady,
} from '@repo/mocks/agent';
import { eq } from 'drizzle-orm';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, setup, waitFor } from 'xstate';
import { insertSession, openTestDatabase } from '#mocks/database';
import { initTestRepository } from '#mocks/git';
import { writerMachine } from '../feed/writer-machine';
import { createServerServices } from '../server-services';
import { registryMachine } from './registry-machine';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function openServer({ applyConfigOptions = true } = {}) {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'session-service-')),
  );
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const git = initTestRepository(directory);
  const { database, remove } = openTestDatabase({}, directory);
  cleanups.push(remove);
  const configOptions = [
    {
      configId: 'model',
      name: 'Model',
      category: 'model',
      type: 'select' as const,
      currentValue: 'small',
      options: [
        { value: 'small', name: 'Small' },
        { value: 'large', name: 'Large' },
      ],
    },
  ];
  const streams = new Map<string, MockAgentStream>();
  const commands = new Map<string, VendorCommand[]>();
  const ready = { ...mockReady, configOptions };
  const script: MockAgentScript = {
    // Starts with the values the Session asks for, as the real adapters do.
    connect: async (input) => ({
      ...ready,
      configOptions: configOptions.map((option) => ({
        ...option,
        currentValue: String(
          input.configOptions.find(
            (choice) => choice.configId === option.configId,
          )?.value ?? option.currentValue,
        ),
      })),
    }),
    stream: (stream) => {
      streams.set(stream.input.sessionId, stream);
      commands.set(stream.input.sessionId, []);
      stream.receive((command) => {
        commands.get(stream.input.sessionId)?.push(command);
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
            runtimeDirectory: join(directory, '.argo'),
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
              createMockAdapter(
                {
                  connect: () => Promise.reject(new Error('Sign in first')),
                  // Signed in when the Server starts, signed out by the first Session.
                  probe: vi
                    .fn<() => Promise<AgentProbe>>()
                    .mockResolvedValueOnce({
                      availability: 'available',
                      configOptions: [],
                    })
                    .mockResolvedValue({
                      availability: 'not_signed_in',
                      installStep: 'Sign in first',
                      configOptions: [],
                    }),
                },
                'unavailable',
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
  return {
    caller,
    root,
    streams,
    commands,
    configOptions,
    services,
    database,
    git,
  };
}

const newSession: SessionNewInput = {
  projectId: 'project-1',
  agent: 'mock',
  checkout: { type: 'main' },
  configOptions: [{ configId: 'model', value: 'large' }],
  prompt: [{ type: 'text', text: 'Build it\nand test it' }],
};

it('creates the Checkout, starts the Agent with the chosen options and runs the first Turn in one call', async () => {
  const { caller, streams, database, commands } = openServer();
  const { sessionId } = await caller.session.new({
    ...newSession,
    checkout: { type: 'worktree', baseBranch: 'feature' },
  });
  const stream = streams.get(sessionId);
  expect(stream?.input.configOptions).toEqual([
    { configId: 'model', value: 'large' },
  ]);
  await vi.waitFor(() =>
    expect(commands.get(sessionId)).toEqual([
      {
        type: 'agent.prompt',
        turnId: expect.any(String),
        content: newSession.prompt,
      },
    ]),
  );
  expect(
    (await caller.feed.page({ sessionId, direction: 'tail' })).rows,
  ).toEqual([
    expect.objectContaining({
      sessionUpdate: 'user_message',
      content: newSession.prompt,
    }),
  ]);
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toContainEqual(
    expect.objectContaining({
      sessionId,
      agent: 'mock',
      title: 'Build it',
      titleSource: 'prompt',
      checkout: {
        type: 'worktree',
        path: expect.stringContaining(sessionId),
        branch: `argo/${sessionId}`,
      },
    }),
  );
  await vi.waitFor(() =>
    expect(
      database.select().from(turn).where(eq(turn.sessionId, sessionId)).all(),
    ).toEqual([expect.objectContaining({ status: 'running', model: 'large' })]),
  );
  expect(await caller.projects.list()).toEqual([
    expect.objectContaining({
      checkoutChoice: { type: 'worktree', baseBranch: 'feature' },
    }),
  ]);
});

it.each([{ type: 'main' }, { type: 'worktree', baseBranch: 'main' }] as const)(
  'leaves no Session and no worktree when the Agent cannot start in the $type checkout',
  async (checkout) => {
    const { caller, git } = openServer();
    const availability = async () =>
      (await caller.agents.list()).find(({ agent }) => agent === 'unavailable')
        ?.availability;
    expect(await availability()).toBe('available');
    await expect(
      caller.session.new({ ...newSession, agent: 'unavailable', checkout }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('Sign in first'),
    });
    // The failed start probes the Agent again, so the list catches up without a refresh.
    expect(await availability()).toBe('not_signed_in');
    expect(
      (await caller.session.list({ archived: false })).sessions.map(
        (row) => row.sessionId,
      ),
    ).toEqual(['session-1']);
    expect(
      git('worktree', 'list', '--porcelain').match(/^worktree /gm),
    ).toHaveLength(1);
    expect(git('branch', '--list', 'argo/*')).toBe('');
    expect(await caller.projects.list()).toEqual([
      expect.objectContaining({
        checkoutChoice: { type: 'worktree', baseBranch: 'main' },
      }),
    ]);
  },
);

it('refuses a New Session for an unknown Project, base branch or Agent', async () => {
  const { caller } = openServer();
  await expect(
    caller.session.new({ ...newSession, projectId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(
    caller.session.new({
      ...newSession,
      checkout: { type: 'worktree', baseBranch: 'missing' },
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  await expect(
    caller.session.new({ ...newSession, agent: 'unregistered' }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('lists local branches with the current one, and null when HEAD is detached', async () => {
  const { caller, git } = openServer();
  expect(await caller.projects.branches({ projectId: 'project-1' })).toEqual({
    branches: ['feature', 'main'],
    currentBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await caller.projects.branches({ projectId: 'project-1' })).toEqual({
    branches: ['feature', 'main'],
    currentBranch: null,
  });
  await expect(
    caller.projects.branches({ projectId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

it('defaults the checkout choice to a worktree from the current branch, and the main checkout when HEAD is detached', async () => {
  const { caller, git } = openServer();
  const checkoutChoice = async () =>
    (await caller.projects.list())[0]?.checkoutChoice;
  expect(await checkoutChoice()).toEqual({
    type: 'worktree',
    baseBranch: 'main',
  });
  git('switch', '-q', '--detach', 'feature');
  expect(await checkoutChoice()).toEqual({ type: 'main' });
});

it('returns after dispatching a config choice and delivers later changes through the Feed', async () => {
  const { caller, streams, configOptions, services } = openServer({
    applyConfigOptions: false,
  });
  const sessionId = 'session-1';
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
});

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
