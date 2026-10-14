import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished } from 'vitest';
import { WebSocket } from 'ws';
import { waitFor } from 'xstate';
import { startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const destination = { projectId: 'project-1', agent: 'mock' };

it('real WebSocket discovery serializes Slash suggestions and HTTP reads the cached result', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'available_commands_update',
                availableCommands: [
                  {
                    name: 'review',
                    description: 'Review changes',
                    input: { hint: 'Files to review', _meta: { hidden: true } },
                    _meta: { hidden: true },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  });

  const socket = new WebSocket(host.url.replace('http:', 'ws:'));
  onTestFinished(() => socket.close());
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  const response = new Promise<string>((resolve) =>
    socket.once('message', (message) => {
      if (!Buffer.isBuffer(message))
        throw new Error('Expected a text WebSocket frame');
      resolve(message.toString('utf8'));
    }),
  );

  socket.send(
    JSON.stringify({
      id: 1,
      method: 'mutation',
      params: { path: 'session.refreshDiscovery', input: destination },
    }),
  );

  const expected = {
    configOptions: [],
    commands: [
      {
        name: 'review',
        description: 'Review changes',
        inputHint: 'Files to review',
      },
    ],
  };

  expect(JSON.parse(await response)).toEqual({
    id: 1,
    result: { type: 'data', data: expected },
  });

  const cached = await fetch(
    `${host.url}/trpc/session.discovery?input=${encodeURIComponent(JSON.stringify(destination))}`,
  );

  expect(await cached.json()).toEqual({ result: { data: expected } });
});

it('Engine shutdown withdraws an unfinished discovery and retains resource ownership until process exit', async () => {
  const opened = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    autoExit: false,
    steps: [],
    responses: {
      'session/new': [{ received: opened, waitFor: release.promise }],
    },
  });

  const refreshing = host.caller.session.refreshDiscovery(destination);

  const failed = refreshing.then(
    () => expect.unreachable('Discovery cannot succeed during shutdown'),
    (error) => {
      expect(error).toMatchObject({
        message: 'Engine stopped during discovery',
      });
    },
  );

  await opened.promise;
  host.engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await failed;
  const process = requireScriptedProcessAt(host.agent.processes);
  await expect.poll(() => process.terminations).toBe(1);
  expect(host.engine.getSnapshot().status).toBe('active');
  release.resolve();
  process.exited.resolve();
  await waitFor(host.engine, (snapshot) => snapshot.status === 'done');
  expect(host.engine.getSnapshot().output).toEqual({ exitCode: 0 });
});
