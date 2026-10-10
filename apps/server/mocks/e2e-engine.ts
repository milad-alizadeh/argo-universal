import { randomUUID } from 'node:crypto';
import { agentAdapters } from '@repo/agents';
import { composeEngine } from '@repo/engine/compose';
import type { EngineMessage } from '@repo/engine/ipc';
import {
  removeServerAddress,
  resolveRuntimeDirectory,
  writeServerAddress,
} from '@repo/engine/server-runtime';
import {
  AppFixtureAgents,
  AppFixtureOptions,
  createAppFixtureAdapters,
} from '@repo/mocks/agent/app-fixtures';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { createFileAgentsFetcher } from '@repo/mocks/registry/port';
import { z } from 'zod';
import packageJson from '../package.json' with { type: 'json' };

const home = resolveRuntimeDirectory();
const startedAt = new Date().toISOString();
const version = packageJson.version;
const options = AppFixtureAgents.parse(
  JSON.parse(process.env.ARGO_E2E_AGENTS ?? '{}'),
);
const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65_535)
  .parse(process.env.ARGO_SERVER_PORT);

// With no Supervisor, the Engine publishes its own address.
function publishAddress(message: EngineMessage): void {
  if (message.type !== 'ready') return;
  writeServerAddress(home, {
    pid: process.pid,
    port: message.port,
    version,
    startedAt,
  });
}

const engine = composeEngine({
  home,
  port,
  version,
  startedAt,
  now: Date.now,
  createId: randomUUID,
  report: publishAddress,
  adapters: createAppFixtureAdapters(agentAdapters, options),
  // The production launcher runs each Agent's scripted scenario as a real stdio process.
  resolveAgentLaunch: async (input) => ({
    agentId: input.agent,
    projectId: input.projectId,
    ...scriptedAgentCommand(
      AppFixtureOptions.parse(options[input.agent] ?? {}).scenario,
    ),
    version: '1',
    cwd: input.projectPath,
    env: {},
    authContext: 'shared-fixture',
  }),
  fetchAgents: createFileAgentsFetcher(
    z.string().parse(process.env.ARGO_E2E_REGISTRY_PATH),
  ),
});

function finish(exitCode: number): never {
  removeServerAddress(home, process.pid);
  process.exit(exitCode);
}

engine.subscribe({
  complete: (): never => finish(engine.getSnapshot().output?.exitCode ?? 1),
  error: (error): never => {
    console.error(error);
    return finish(1);
  },
});
engine.start();
