import { randomUUID } from 'node:crypto';
import type {
  PromptRequest,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import { session } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { WebSocket } from 'ws';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { sendHttpRequest } from '#mocks/http-client';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { startHttpServer } from './http-server';

it('rejects a second server on the same port', async (): Promise<void> => {
  const host = await startEngineTestHost();
  await expect(
    startHttpServer({
      createId: randomUUID,
      home: host.home,
      port: Number(new URL(host.url).port),
      version: '1.2.3',
      startedAt: '2026-10-03T00:00:00.000Z',
      database: host.database,
      sessions: host.openSessions,
      databaseWriter: host.databaseWriter,
      syncSupervisor: host.engine.system.get('syncSupervisor'),
    }),
  ).rejects.toMatchObject({ code: 'EADDRINUSE' });
  expect(
    (await sendHttpRequest(host.url, { path: '/trpc/system.info' })).status,
  ).toBe(200);
});

it('closes while a WebSocket client is connected', async (): Promise<void> => {
  const host = await startEngineTestHost();
  const socket = new WebSocket(host.url.replace('http:', 'ws:'));
  await new Promise((resolve, reject): void => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  const closed = new Promise((resolve): WebSocket =>
    socket.once('close', resolve),
  );
  await host.stop();
  await closed;
  expect(socket.readyState).toBe(WebSocket.CLOSED);
});

it.each(agentAdapters.map((adapter): string => adapter.agent))(
  'does not send the waiting %s prompt after HTTP closure begins',
  async (agent): Promise<void> => {
    const stored = openTestDatabase();
    onTestFinished(stored.remove);
    const startup = Promise.withResolvers<void>();
    const began = Promise.withResolvers<NewSessionRequest>();
    const commands: PromptRequest[] = [];
    const host = await startEngineTestHost({
      database: stored.database,
      ...scriptedEngineInput(
        {
          steps: [],
          responses: {
            'session/new': [{ received: began, waitFor: startup.promise }],
            'session/prompt': [{ requests: commands }],
          },
        },
        agent,
      ),
    });
    stored.database.update(session).set({ agent }).run();

    const response = fetch(`${host.url}/trpc/session.prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        prompt: [{ type: 'text', text: 'Too late' }],
      }),
    }).catch((): null => null);
    await began.promise;
    const closing = host.stop();
    startup.resolve();
    await closing;
    await new Promise<void>((resolve): NodeJS.Immediate =>
      setImmediate(resolve),
    );
    expect(commands).toEqual([]);
    await response;
  },
);
