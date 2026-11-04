import { execFile, type ExecFileException } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const bin = fileURLToPath(new URL('../bin/argo-plugin.mjs', import.meta.url));

const plugin = fileURLToPath(new URL('../mocks/plugin/', import.meta.url));

type CommandResult = { code: string | number | null; output: string };

// A Plugin author runs the kit's command from the Plugin's own folder.
function argoPlugin(args: string[], cwd = plugin): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [bin, ...args],
      { timeout: 20_000, cwd },
      (error, output, stderr) => {
        resolve({ code: errorCode(error), output: output + stderr });
      },
    );
  });
}

function errorCode(error: ExecFileException | null): string | number {
  return error ? (error.code ?? 1) : 0;
}

it('validates the Plugin in the current folder', async () => {
  expect(await argoPlugin(['validate', '.'])).toMatchObject({
    code: 0,
    output: expect.stringContaining('Plugin is valid'),
  });
}, 30_000);

it('names itself in its usage line', async () => {
  expect(await argoPlugin([])).toMatchObject({
    code: 1,
    output:
      'Usage: argo-plugin <validate|types|test> <dir> (types takes --check)\n',
  });
}, 30_000);

const manifestFile = 'plugin.json';

// The fixture Plugin's manifest, declaring one Operation whose `status` takes these choices.
async function writeManifest(
  directory: string,
  choices: string[],
): Promise<void> {
  const manifest = JSON.parse(
    await readFile(join(plugin, manifestFile), 'utf8'),
  );

  manifest.contributes.operations = [
    {
      name: 'setStatus',
      label: 'Set status',
      description: 'Closes or reopens one Issue.',
      tier: 'act',
      params: {
        status: {
          type: 'string',
          description: 'The status.',
          required: true,
          choices,
        },
      },
      caller: ['project'],
    },
  ];
  await writeFile(join(directory, manifestFile), JSON.stringify(manifest));
  await writeFile(
    join(directory, manifest.main),
    'export function register() {}\n',
  );
}

it('writes the manifest’s Operations as types, and fails the check once the manifest changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-plugin-types-'));

  try {
    await writeManifest(directory, ['open', 'closed']);

    expect(await argoPlugin(['types', '.'], directory)).toMatchObject({
      code: 0,
    });
    expect(
      await readFile(join(directory, 'plugin.gen.d.ts'), 'utf8'),
    ).toContain('"choices": [\n');
    expect(
      await argoPlugin(['types', '.', '--check'], directory),
    ).toMatchObject({
      code: 0,
    });

    await writeManifest(directory, ['open', 'closed', 'done']);

    expect(
      await argoPlugin(['types', '.', '--check'], directory),
    ).toMatchObject({
      code: 1,
      output: 'plugin.gen.d.ts is missing or stale. Run argo-plugin types.\n',
    });
  } finally {
    await rm(directory, { recursive: true });
  }
}, 30_000);
