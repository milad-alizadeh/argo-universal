import { appRouter, type Services } from '@repo/api';
import { createMockAdapter } from '@repo/mocks/agent';
import { expect, it } from 'vitest';
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
    connect: async () => ({
      type: 'agent.ready',
      vendorSessionId: 'vendor-1',
      configOptions: [],
      capabilities: { planApproval: 'continueTurn', stopShell: false },
      continuedOutside: false,
    }),
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
    stop: async () => {},
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
