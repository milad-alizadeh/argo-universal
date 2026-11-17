import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { argoInstructionsMarkdown } from '@repo/contracts/agents/argo-instructions';
import { productCompatibility } from '@repo/contracts/product-identity';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { piLauncherFiles } from './pi-launcher';

const run = promisify(execFile);

const extensionName = productCompatibility.piExtension;

const sessionToken = 'session-token';

// Loads the extension as pi would, with a stand-in `pi` that records the MCP server and the prompt handler.
const standIn = `
const servers = {};
const handlers = [];
const pi = {
  registerMcpServer: (name, config) => { servers[name] = config; },
  on: (event, handler) => { if (event === 'before_agent_start') handlers.push(handler); },
};
const { default: extension } = await import(process.argv[1]);
extension(pi);
console.log(JSON.stringify({ servers, prompt: handlers[0]?.({ systemPrompt: 'Base' }).systemPrompt ?? null }));
`;

const Loaded = z.object({
  servers: z.record(
    z.string(),
    z.object({
      args: z.array(z.string()),
      env: z.record(z.string(), z.string()),
      exposure: z.string(),
    }),
  ),
  prompt: z.string().nullable(),
});

async function writeLauncher(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'argo-pi-'));

  for (const file of piLauncherFiles(directory))
    await writeFile(join(directory, file.name), file.content, {
      mode: file.mode,
    });

  return directory;
}

async function loadExtension(
  environment: Record<string, string>,
): Promise<z.infer<typeof Loaded>> {
  const directory = await writeLauncher();

  const { stdout } = await run(
    process.execPath,
    ['--input-type=module', '-e', standIn, join(directory, extensionName)],
    { env: { PATH: process.env.PATH, ...environment } },
  );

  return Loaded.parse(JSON.parse(stdout));
}

// A stand-in for pi that prints the arguments it was started with.
const printArguments = '#!/bin/sh\nprintf "%s\\n" "$@"\n';

it('starts the pi command the person set with the extension, passing pi-acp arguments on', async () => {
  const directory = await writeLauncher();
  const pi = join(directory, 'pi-stand-in');

  await writeFile(pi, printArguments, { mode: 0o755 });

  const { stdout } = await run(
    join(directory, productCompatibility.piLauncher),
    ['--mode', 'rpc'],
    { env: { PATH: process.env.PATH, ARGO_PI_COMMAND: pi } },
  );

  expect(stdout.trim().split('\n')).toEqual([
    '-e',
    join(directory, extensionName),
    '--mode',
    'rpc',
  ]);
});

it('gives a pi Session the Argo MCP server and appends the Argo instructions', async () => {
  const loaded = await loadExtension({
    ARGO_TOKEN: sessionToken,
    ARGO_HOME: '/argo-home',
  });

  expect(loaded.servers.argo).toMatchObject({
    args: ['mcp'],
    env: { ARGO_TOKEN: sessionToken, ARGO_HOME: '/argo-home' },
    exposure: 'direct',
  });
  expect(loaded.prompt).toBe(
    `Base\n\n${argoInstructionsMarkdown({ todoList: true })}`,
  );
});

it('leaves the checklist instruction out when the person turned it off', async () => {
  const loaded = await loadExtension({
    ARGO_TOKEN: sessionToken,
    ARGO_TODO_LIST: '0',
  });

  expect(loaded.servers.argo?.env).toMatchObject({ ARGO_TODO_LIST: '0' });
  expect(loaded.prompt).toBe(
    `Base\n\n${argoInstructionsMarkdown({ todoList: false })}`,
  );
});

it('does nothing in a pi that Argo did not start', async () => {
  expect(await loadExtension({})).toEqual({ servers: {}, prompt: null });
});
