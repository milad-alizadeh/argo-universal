import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginTemplate } from '@repo/contracts/plugins/plugin-template';
import { expect, it, onTestFinished } from 'vitest';
import { z } from 'zod';
import { runPluginCommand } from './plugin-command';

const kitRoot = fileURLToPath(new URL('..', import.meta.url));

const checkFile = 'package.json';

// Inside the kit's package, with the node_modules a `pnpm install` gives a Plugin: the kit, Node's types, TypeScript.
async function scaffold(): Promise<string> {
  const directory = await mkdtemp(join(kitRoot, 'mocks', 'scaffold-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  for (const [file, content] of pluginTemplate(
    'reading-list',
    'Reading List',
  )) {
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await writeFile(join(directory, file), content);
  }

  await mkdir(join(directory, 'node_modules', '@argo'), { recursive: true });
  await symlink(
    kitRoot,
    join(directory, 'node_modules', '@argo', 'plugin-kit'),
  );
  await symlink(
    join(kitRoot, 'node_modules', '@types'),
    join(directory, 'node_modules', '@types'),
  );

  return directory;
}

type Step = { code: number; output: string };

function tsc(args: string[], cwd: string): Promise<Step> {
  const bin = join(kitRoot, 'node_modules', '.bin', 'tsc');

  return new Promise((resolve) => {
    execFile(bin, args, { cwd, timeout: 120_000 }, (error, out, err) => {
      resolve({ code: error ? 1 : 0, output: out + err });
    });
  });
}

async function argoPlugin(args: string[], directory: string): Promise<Step> {
  const lines: string[] = [];

  const code = await runPluginCommand(
    args.map((arg) => (arg === '.' ? directory : arg)),
    (line) => lines.push(line),
    'argo-plugin',
  );

  return { code, output: lines.join('\n') };
}

// One step of the scaffold's own `check` script, run as the script runs it.
function runStep(step: string, directory: string): Promise<Step> {
  const [program = '', ...args] = step.split(' ');

  return program === 'tsc' ? tsc(args, directory) : argoPlugin(args, directory);
}

const Manifest = z.object({ scripts: z.object({ check: z.string() }) });

async function checkSteps(directory: string): Promise<string[]> {
  const text = await readFile(join(directory, checkFile), 'utf8');

  return Manifest.parse(JSON.parse(text)).scripts.check.split(' && ');
}

it('writes a Plugin that passes every step of its own check script', async () => {
  const directory = await scaffold();
  const steps = await checkSteps(directory);

  expect(steps.filter((step) => step.startsWith('tsc'))).toHaveLength(2);

  for (const step of steps)
    expect({ step, ...(await runStep(step, directory)) }).toMatchObject({
      step,
      code: 0,
    });
}, 180_000);
