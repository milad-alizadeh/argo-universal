import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginTemplate } from '@repo/contracts/plugins/plugin-template';
import { expect, it, onTestFinished } from 'vitest';
import { runPluginCommand } from './plugin-command';

const here = fileURLToPath(new URL('.', import.meta.url));

// Inside the kit's package, so the scaffold's test imports `@argo/plugin-kit/testing` as a Plugin in the repository does.
async function scaffold(): Promise<string> {
  const directory = await mkdtemp(join(here, '..', 'mocks', 'scaffold-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  for (const [file, content] of pluginTemplate(
    'reading-list',
    'Reading List',
  )) {
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await writeFile(join(directory, file), content);
  }

  return directory;
}

async function run(
  command: string[],
): Promise<{ code: number; output: string }> {
  const lines: string[] = [];

  const code = await runPluginCommand(
    command,
    (line) => lines.push(line),
    'argo-plugin',
  );

  return { code, output: lines.join('\n') };
}

it('writes a Plugin whose types, validation and own harness test pass', async () => {
  const directory = await scaffold();

  expect(await run(['types', directory, '--check'])).toEqual({
    code: 0,
    output: '',
  });
  expect(await run(['validate', directory])).toMatchObject({
    code: 0,
    output: expect.stringContaining('Plugin is valid'),
  });
  expect(await run(['test', directory])).toMatchObject({
    code: 0,
    output: expect.stringContaining('PASS'),
  });
}, 60_000);
