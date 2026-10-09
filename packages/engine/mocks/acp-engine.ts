import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMockAdapter } from '@repo/mocks/agent';
import { onTestFinished } from 'vitest';
import { createActor, waitFor, type Actor } from 'xstate';
import { createEngineContext, type Context } from '../src/engine/context';
import { engineMachine } from '../src/engine/machine';
import { appRouter } from '../src/engine/router';
import { findSessionRegistry } from '../src/services/sessions';
import { createResourcePeer, resourceLaunch } from './acp-resource';
import { openTestDatabase } from './database';
import { initTestRepository } from './git';

type AcpEngineHost = {
  engine: Actor<typeof engineMachine>;
  context: Context;
  caller: ReturnType<typeof appRouter.createCaller>;
  peer: ReturnType<typeof createResourcePeer>;
};
export const emptySessionInput = {
  projectId: 'project-1',
  agent: 'mock',
  checkout: { type: 'main' as const },
  configOptions: [],
  prompt: [],
};
const stopEngine = async (
  engine: Actor<typeof engineMachine>,
): Promise<void> => {
  engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await waitFor(engine, (snapshot) => snapshot.status === 'done');
  engine.stop();
};
export const startAcpEngine = async (
  peerInput: Parameters<typeof createResourcePeer>[0] = {},
  createId: () => string = randomUUID,
): Promise<AcpEngineHost> => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-acp-engine-'));
  initTestRepository(directory);
  const storage = openTestDatabase({}, directory);
  const peer = createResourcePeer(peerInput);
  const engine = createActor(engineMachine, {
    input: {
      home: storage.directory,
      port: 0,
      version: '1',
      startedAt: new Date().toISOString(),
      now: Date.now,
      createId,
      adapters: [createMockAdapter()],
      acp: peer,
      registry: {
        readRegistry: async () => ({ version: '1.0.0', agents: [] }),
      },
      resolveAgentLaunch: async (input) => ({
        ...resourceLaunch,
        agentId: input.agent,
        projectId: input.projectId,
        cwd: input.projectPath,
      }),
    },
  }).start();
  onTestFinished(async () => {
    for (const process of peer.processes) process.exited.resolve();
    await stopEngine(engine);
    storage.remove();
    rmSync(directory, { recursive: true, force: true });
  });
  await waitFor(engine, (snapshot) => snapshot.matches({ live: 'running' }));
  return { engine, peer, ...createEngineCaller(engine) };
};
const createEngineCaller = (
  engine: Actor<typeof engineMachine>,
): Pick<AcpEngineHost, 'context' | 'caller'> => {
  const { database, home, version, startedAt, createId } =
    engine.getSnapshot().context;
  const sessions = findSessionRegistry(engine.system);
  if (!database || !sessions) throw new Error('Engine is not ready');
  const context = createEngineContext({
    database,
    sessions,
    version,
    startedAt,
    createId,
    blobsFolder: join(home, 'blobs'),
  });
  return { context, caller: appRouter.createCaller(context) };
};
