import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createInstallationPorts,
  installationExecutable,
} from '@repo/mocks/registry/installation';
import { zipSync } from 'fflate';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { installEntry } from '#mocks/installation';
import {
  materializeAgent,
  type MaterializationInput,
} from './install/materialization/materialize';
import type { InstallRecipe } from './install/materialization/recipe';
import {
  selectedDirectory,
  selectedLaunchDefinition,
} from './install/selection/selection';

const fixturePackage = 'fixture-install';

let home: string;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'install-files-'));
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

const inputFor = (
  recipe: InstallRecipe,
  bytes: Uint8Array = installationExecutable,
): MaterializationInput => ({
  home,
  agentId: fixturePackage,
  operationId: randomUUID(),
  entry: installEntry('binary'),
  recipe,
  signal: new AbortController().signal,
  ports: { ...createInstallationPorts(), download: async () => bytes },
});

const binaryRecipe = (
  archive = 'https://example.org/agent',
): Extract<InstallRecipe, { kind: 'binary' }> => ({
  kind: 'binary',
  archive,
  cmd: './agent',
  args: [],
  env: {},
});

it.each(['raw', 'zip'])(
  'publishes a verified %s executable from real files',
  async (format) => {
    const bytes =
      format === 'zip'
        ? zipSync({ agent: installationExecutable })
        : installationExecutable;

    const input = inputFor(
      binaryRecipe(
        `https://example.org/agent${format === 'zip' ? '.zip' : ''}`,
      ),
      bytes,
    );

    const selection = await materializeAgent(input);

    const definition = await selectedLaunchDefinition(
      home,
      input.agentId,
      selection,
    );

    expect(await readFile(definition.executable)).toEqual(
      installationExecutable,
    );
  },
);

it.each(['../outside', '/outside', 'C:\\outside', 'folder/../../outside'])(
  'rejects archive launch path %s without publishing',
  async (cmd) => {
    const input = inputFor({ ...binaryRecipe(), kind: 'binary', cmd });
    await expect(materializeAgent(input)).rejects.toThrow('escapes');
  },
);

it('rejects a checksum mismatch before publishing any files', async () => {
  const input = inputFor({
    ...binaryRecipe(),
    kind: 'binary',
    sha256: '0'.repeat(64),
  });

  await expect(materializeAgent(input)).rejects.toThrow('integrity');
});

it('rejects ZIP traversal even when the selected launch entry is safe', async () => {
  const input = inputFor(
    binaryRecipe('https://example.org/agent.zip'),
    zipSync({
      agent: installationExecutable,
      '../outside': new Uint8Array([1]),
    }),
  );

  await expect(materializeAgent(input)).rejects.toThrow('escapes');
});

it.each(['npx', 'uvx'] as const)(
  'publishes the pinned %s package with a verified executable',
  async (kind) => {
    const recipe: InstallRecipe = {
      kind,
      name: fixturePackage,
      version: '1.2.3',
      package:
        kind === 'npx' ? 'fixture-install@1.2.3' : 'fixture-install==1.2.3',
      args: ['--acp'],
      env: {},
    };

    const input = inputFor(recipe);
    const selection = await materializeAgent(input);

    const definition = await selectedLaunchDefinition(
      home,
      input.agentId,
      selection,
    );

    const uvScript =
      process.platform === 'win32'
        ? 'Scripts/fixture-install.exe'
        : 'bin/fixture-install';

    expect(definition.executable).toBe(
      kind === 'npx'
        ? process.execPath
        : await realpath(
            join(
              selectedDirectory(home, input.agentId, selection),
              '.venv',
              uvScript,
            ),
          ),
    );
  },
);

it.each(['npx', 'uvx'] as const)(
  'rejects %s installation metadata for a different release',
  async (kind) => {
    const recipe: InstallRecipe = {
      kind,
      name: fixturePackage,
      version: '9.9.9',
      package:
        kind === 'npx' ? 'fixture-install@9.9.9' : 'fixture-install==9.9.9',
      args: [],
      env: {},
    };

    await expect(materializeAgent(inputFor(recipe))).rejects.toThrow(/release/);
  },
);
