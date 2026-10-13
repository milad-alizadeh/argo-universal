import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { openDatabase } from '@repo/db';
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
  fixtureAgents,
} from '@repo/mocks/agent/app-fixtures';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import { createFileAgentsFetcher } from '@repo/mocks/registry/port';
import { z } from 'zod';
import packageJson from '../package.json' with { type: 'json' };

const home = resolveRuntimeDirectory();

const startedAt = new Date().toISOString();

const version = packageJson.version;

const options = AppFixtureAgents.parse(
  JSON.parse(process.env.ARGO_E2E_AGENTS ?? '{}'),
);

const requestLog = process.env.ARGO_E2E_REQUEST_LOG;

// The scripted Agents log the ACP requests e2e steps check.
const agentEnvironment: Record<string, string> = requestLog
  ? { ARGO_E2E_REQUEST_LOG: requestLog }
  : {};

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

const seed = openDatabase(join(home, 'argo.db'));

const save = seed.$client.prepare(
  "update agents set configuration = ? where id = ? and json_extract(configuration, '$.source') = 'registry' and json_extract(configuration, '$.release') is null",
);

for (const identity of fixtureAgents) {
  const fixture = AppFixtureOptions.parse(options[identity.agent] ?? {});

  const configuration =
    fixture.availability === 'not_installed'
      ? { source: 'registry', release: null, overrides: { args: [], env: [] } }
      : {
          source: 'custom',
          definition: {
            name: identity.label,
            ...scriptedAgentCommand(
              fixture.availability === 'not_signed_in'
                ? 'signed-out'
                : fixture.scenario,
            ),
            env: Object.entries(agentEnvironment).map(([name, value]) => ({
              name,
              value,
            })),
          },
        };

  save.run(JSON.stringify(configuration), identity.agent);
}

seed.$client.close();

const engine = composeEngine({
  home,
  port,
  version,
  startedAt,
  now: Date.now,
  createId: randomUUID,
  report: publishAddress,
  installationPorts: createInstallationPorts({
    packageName: 'example-agent',
    scenarioPath: z.string().parse(process.env.ARGO_E2E_INSTALLATION_PATH),
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
