import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '@repo/db';
import { project } from '@repo/db/schema';
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
import { createInstallationPorts } from '@repo/mocks/registry/installation';
import { createFileAgentsFetcher } from '@repo/mocks/registry/port';
import { scriptedDownloads } from '@repo/mocks/registry/scripted';
import { z } from 'zod';
import packageJson from '../package.json' with { type: 'json' };

const home = resolveRuntimeDirectory();

const firstStart = !existsSync(join(home, 'fixture-started'));

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
  if (process.send) {
    process.send(message);

    return;
  }

  if (message.type !== 'ready') return;
  seedInitialProjects();
  writeServerAddress(home, {
    pid: process.pid,
    port: message.port,
    version,
    startedAt,
  });
}

const seed = openDatabase(join(home, 'argo.db'));

const save = seed.$client.prepare(
  'INSERT OR IGNORE INTO agent_servers (id) VALUES (?)',
);

for (const identity of fixtureAgents) {
  if (AppFixtureOptions.parse(options[identity.agent] ?? {}).installed)
    save.run(identity.agent);
}

seed.$client.close();

const engine = composeEngine({
  cliEntry: fileURLToPath(new URL('../../cli/bin/argo.mjs', import.meta.url)),
  home,
  port,
  version,
  firstPartyPluginsDirectory: join(home, 'shipped-plugins'),
  startedAt,
  now: Date.now,
  createId: randomUUID,
  report: publishAddress,
  installationPorts: createInstallationPorts({
    packageName: 'example-agent',
    downloads: scriptedDownloads(options),
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

function seedInitialProjects(): void {
  if (firstStart && process.env.ARGO_E2E_NO_PROJECTS === '1') clearProjects();
  writeFileSync(join(home, 'fixture-started'), 'started');
}

function clearProjects(): void {
  engine.getSnapshot().context.database?.delete(project).run();
}
