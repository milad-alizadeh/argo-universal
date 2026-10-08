import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agentAdapters } from '@repo/agents';
import { resolveRuntimeDirectory } from '@repo/api/server-runtime';
import { ServerAddress } from '@repo/contracts';
import {
  AppFixtureAgents,
  createAppFixtureAdapters,
} from '@repo/mocks/agent/app-fixtures';
import { createActor } from 'xstate';
import { z } from 'zod';
import packageJson from '../package.json' with { type: 'json' };
import { engineMachine } from '../src/engine/machine';
import type { EngineMessage } from '../src/supervisor/engine-message';

const home = resolveRuntimeDirectory();
const startedAt = new Date().toISOString();
const version = packageJson.version;
const addressFile = join(home, 'server.json');
const options = AppFixtureAgents.parse(
  JSON.parse(process.env.ARGO_E2E_AGENTS ?? '{}'),
);
const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65_535)
  .parse(process.env.ARGO_SERVER_PORT);

function publishAddress(_: unknown, message: EngineMessage): void {
  if (message.type !== 'ready') return;
  mkdirSync(home, { recursive: true });
  writeFileSync(
    addressFile,
    JSON.stringify(
      ServerAddress.parse({
        pid: process.pid,
        port: message.port,
        version,
        startedAt,
      }),
    ),
  );
}

const engine = createActor(
  engineMachine.provide({ actions: { sendToSupervisor: publishAddress } }),
  {
    input: {
      home,
      port,
      version,
      startedAt,
      now: Date.now,
      createId: randomUUID,
      adapters: createAppFixtureAdapters(agentAdapters, options),
    },
  },
);

function finish(exitCode: number): never {
  rmSync(addressFile, { force: true });
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
