import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectInfo } from '@repo/contracts';
import { OperationRunResponse } from '@repo/contracts/operations/control';
import { readControlToken } from '@repo/engine/server-runtime';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { createTRPCUntypedClient, httpLink } from '@trpc/client';
import { onTestFinished } from 'vitest';
import { z } from 'zod';
import { serverFiles } from '../../e2e/own-server-setup.ts';
import { startOwnServer } from '../../e2e/own-server.ts';

export async function runtimeTestHost(
  scenario:
    | 'reply'
    | 'feed-work'
    | 'feed-history'
    | 'completed-tool-held-turn'
    | 'held-until-released'
    | 'held-mode' = 'reply',
  seed = true,
): Promise<{
  target: { httpUrl: string; token: string; sessionId: string };
  initialTurnId: string | null;
  requestLogPath: string;
  home: string;
  reportPath: string;
  caller: ReturnType<typeof createTRPCUntypedClient>;
}> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'argo-runtime-timing-'),
  );

  const server = await startOwnServer(
    directory,
    Object.fromEntries(appFixtureAgentIds.map((id) => [id, { scenario }])),
  );

  onTestFinished(async () => {
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  });
  const token = await readControlToken(path.join(directory, 'server-home'));

  const caller = createTRPCUntypedClient({
    links: [
      httpLink({
        url: `${server.httpUrl}/trpc`,
        headers: { authorization: `Bearer ${token}` },
      }),
    ],
  });

  const project = await fixtureProject(caller);
  const created = await createSession(caller, project, seed);
  const identity = z.object({ sessionId: z.string() }).parse(created.result);

  return {
    target: { httpUrl: server.httpUrl, token, sessionId: identity.sessionId },
    initialTurnId: initialTurn(created),
    requestLogPath: serverFiles(directory).requestLogPath,
    home: path.join(directory, 'server-home'),
    reportPath: path.join(directory, 'runtime.json'),
    caller,
  };
}

function fixtureAgent(): string {
  const id = appFixtureAgentIds[0];

  if (!id) throw new Error('Runtime fixture needs an Agent');

  return id;
}

async function fixtureProject(
  caller: ReturnType<typeof createTRPCUntypedClient>,
): Promise<ProjectInfo> {
  const project = z
    .array(ProjectInfo)
    .parse(await caller.query('project.list'))[0];

  if (!project) throw new Error('Runtime fixture needs a Project and Agent');

  return project;
}

async function createSession(
  caller: ReturnType<typeof createTRPCUntypedClient>,
  project: ProjectInfo,
  seed: boolean,
): Promise<Extract<OperationRunResponse, { kind: 'operation_execution' }>> {
  const created = OperationRunResponse.parse(
    await caller.mutation('operations.run', {
      id: 'session.new',
      params: {
        projectId: project.id,
        agent: fixtureAgent(),
        checkout: { type: 'main' },
        configOptions: [],
        prompt: seed ? [{ type: 'text', text: 'Earlier unrelated Turn' }] : [],
      },
      wait: true,
    }),
  );

  if (created.kind !== 'operation_execution')
    throw new Error('Runtime fixture needs a Session creation');

  return created;
}

function initialTurn(
  created: Extract<OperationRunResponse, { kind: 'operation_execution' }>,
): string | null {
  return created.turn?.id ?? null;
}
