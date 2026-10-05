import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { agentAdapters } from '@repo/agents';
import { appRouter, type Services } from '@repo/api';
import { createMockAdapter } from '@repo/mocks/agent';
import { mockClis } from '@repo/mocks/cli';
import { expect, it, vi } from 'vitest';
import { createActor, fromCallback, fromPromise, waitFor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { createServerServices } from '../services/server-services';
import type { HttpServerOptions } from './http-server';
import { engineMachine } from './machine';

it('serves live Session procedures and drains their Feed before closing the database', async () => {
  const { database, remove } = openTestDatabase();
  let services: Services | undefined;
  let closedDatabase = false;
  const adapter = createMockAdapter({
    stream: (stream) => {
      stream.receive((command) => {
        if (command.type === 'agent.prompt')
          stream.send({
            type: 'agent.feed',
            change: {
              type: 'upsert',
              update: {
                id: 'reply',
                sessionUpdate: 'agent_message',
                state: 'open',
                messageId: 'reply',
                content: [{ type: 'text', text: 'Hello from the Agent' }],
              },
            },
          });
      });
    },
  });
  const machine = engineMachine.provide({
    actors: {
      openDatabase: fromPromise(async () => database),
      processSignals: fromCallback(() => {}),
      startHttpServer: fromPromise(
        async ({ input }: { input: HttpServerOptions }) => {
          services = createServerServices(input);
          return { close: async () => {} };
        },
      ),
    },
    actions: {
      log: () => {},
      sendToSupervisor: () => {},
      closeDatabase: () => {
        closedDatabase = true;
      },
    },
  });
  const engine = createActor(machine, {
    input: {
      home: '/unused',
      port: 7337,
      version: '1',
      startedAt: new Date().toISOString(),
      adapters: [adapter],
    },
  }).start();
  try {
    await waitFor(engine, (snapshot) => snapshot.matches({ live: 'running' }));
    if (!services) throw new Error('No services');
    const caller = appRouter.createCaller({ services });
    const { messageId } = await caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Hi' }],
    });
    expect(
      await caller.feed.row({ sessionId: 'session-1', id: messageId }),
    ).toMatchObject({ sessionUpdate: 'user_message' });
    expect(
      await caller.feed.row({ sessionId: 'session-1', id: 'reply' }),
    ).toMatchObject({
      content: [{ type: 'text', text: 'Hello from the Agent' }],
    });
    engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
    await waitFor(engine, (snapshot) => snapshot.status === 'done');
    expect(closedDatabase).toBe(true);
    expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
    expect(
      await caller.feed.page({ sessionId: 'session-1', direction: 'tail' }),
    ).toMatchObject({ rows: [{ id: messageId }, { id: 'reply' }] });
  } finally {
    engine.stop();
    remove();
  }
});

it.each(agentAdapters)(
  'serves a recorded $agent Turn through tRPC and stores it under one Argo Turn id',
  async (adapter) => {
    const directory = realpathSync(
      mkdtempSync(path.join(tmpdir(), 'argo-composition-')),
    );
    const mockCli = mockClis[adapter.agent];
    if (!mockCli) throw new Error(`No mock CLI for ${adapter.agent}`);
    await mockCli.write(directory, { recording: mockCli.recordings.turn });
    vi.stubEnv(
      'PATH',
      `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
    );
    for (const [key, value] of Object.entries(
      mockCli.writeTranscript(directory, directory, crypto.randomUUID()),
    ))
      vi.stubEnv(key, value);
    const { database, remove } = openTestDatabase(
      { agent: adapter.agent, checkoutPath: directory },
      directory,
    );
    let services: Services | undefined;
    const machine = engineMachine.provide({
      actors: {
        openDatabase: fromPromise(async () => database),
        processSignals: fromCallback(() => {}),
        startHttpServer: fromPromise(
          async ({ input }: { input: HttpServerOptions }) => {
            services = createServerServices(input);
            return { close: async () => {} };
          },
        ),
      },
      actions: {
        log: () => {},
        sendToSupervisor: () => {},
        closeDatabase: () => {},
      },
    });
    const engine = createActor(machine, {
      input: {
        home: directory,
        port: 7337,
        version: '1',
        startedAt: new Date().toISOString(),
        adapters: [adapter],
      },
    }).start();
    try {
      await waitFor(engine, (snapshot) =>
        snapshot.matches({ live: 'running' }),
      );
      if (!services) throw new Error('No services');
      const caller = appRouter.createCaller({ services });
      const { messageId } = await caller.session.prompt({
        sessionId: 'session-1',
        prompt: [{ type: 'text', text: 'Edit the files and run a command.' }],
      });
      await expect
        .poll(
          async () => {
            const { rows } = await caller.feed.page({
              sessionId: 'session-1',
              direction: 'tail',
            });
            return (
              rows.at(-1)?.sessionUpdate === 'agent_message' &&
              rows.at(-1)?.state === 'settled'
            );
          },
          { timeout: 10000 },
        )
        .toBe(true);
      engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
      await waitFor(engine, (snapshot) => snapshot.status === 'done');
      const { rows } = await caller.feed.page({
        sessionId: 'session-1',
        direction: 'tail',
      });
      expect(rows[0]).toMatchObject({
        id: messageId,
        sessionUpdate: 'user_message',
        content: [{ type: 'text', text: 'Edit the files and run a command.' }],
      });
      expect(
        rows.filter((row) => row.sessionUpdate === 'user_message'),
      ).toHaveLength(1);
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sessionUpdate: 'tool_call_update',
            kind: 'edit',
            state: 'settled',
            status: 'completed',
          }),
          expect.objectContaining({
            sessionUpdate: 'tool_call_update',
            kind: 'execute',
            state: 'settled',
            status: 'completed',
          }),
        ]),
      );
      expect(new Set(rows.map((row) => row.turnId)).size).toBe(1);
      expect(engine.getSnapshot().output).toEqual({ exitCode: 0 });
    } finally {
      engine.stop();
      remove();
      vi.unstubAllEnvs();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
