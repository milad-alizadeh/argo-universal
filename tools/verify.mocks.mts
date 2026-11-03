import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveExecutable } from '@repo/executables';

export const verifyScripts = [
  'verify.mts',
  'verify-scope.mts',
  'verify-base.mts',
  'hook-checks.mts',
  'check-operation-mutations.mts',
  'operation-mutation-rules.mts',
  'operation-mutation-exceptions.mts',
  'tracked-files.mts',
  'generate-operations.mts',
];

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

export const reorderedSum = 'export const sum = (a, b) => b + a;\n';

export const generatedProcedureFile =
  'packages/engine/src/operations/router.gen.ts';

// verify runs the Registry validators' own --check beside the Operation procedures'.
export const registryValidatorGenerator =
  'packages/contracts/tools/registry/generate-validators.mts';

export interface VerifyRun {
  status: number | null;
  output: string;
}

export interface Checkout {
  root: string;
  git: (...args: string[]) => void;
  write: (file: string, text: string) => void;
  verify: (args?: string[], env?: NodeJS.ProcessEnv) => VerifyRun;
}

function gitIn(root: string, args: string[]): void {
  const result = spawnSync(resolveExecutable('git'), args, {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) throw new Error(result.stderr);
}

// VERIFY_BASE is cleared so the caller's own does not leak into the checkout.
function verifyIn(
  root: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): VerifyRun {
  const script = path.join(root, 'tools/verify.mts');

  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, VERIFY_BASE: '', ...env },
  });

  return { status: result.status, output: result.stdout + result.stderr };
}

const checkoutAt = (root: string): Checkout => ({
  root,
  git: (...args) => gitIn(root, args),
  write: (file, text) => writeFileSync(path.join(root, file), text),
  verify: (args = [], env = {}) => verifyIn(root, args, env),
});

function copy(root: string, file: string): void {
  const destination = path.join(root, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(path.join(repositoryRoot, file), destination);
}

function link(root: string, target: string): void {
  mkdirSync(path.dirname(path.join(root, target)), { recursive: true });
  symlinkSync(path.join(repositoryRoot, target), path.join(root, target));
}

function copyTools(root: string): void {
  mkdirSync(path.join(root, 'tools'));

  for (const script of verifyScripts) copy(root, `tools/${script}`);
  copy(root, generatedProcedureFile);
  copy(root, '.oxfmtrc.json');
  link(root, registryValidatorGenerator);
  link(root, 'tools/node_modules');
  link(root, 'node_modules');
}

const sumTest =
  "import { expect, it } from 'vitest';\nimport { sum } from './sum.mjs';\n\nit('adds', () => {\n  expect(sum(1, 2)).toBe(3);\n});\n";

function commitBase({ git, write }: Checkout): void {
  write('package.json', '{ "type": "module" }\n');
  write('.gitignore', 'node_modules\n');
  write('sum.mjs', 'export const sum = (a, b) => a + b;\n');
  write('sum.test.mjs', sumTest);
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
}

// A checkout on main with one module and the test that imports it.
export function createCheckout(): Checkout {
  const checkout = checkoutAt(mkdtempSync(path.join(tmpdir(), 'verify-')));

  copyTools(checkout.root);
  commitBase(checkout);

  return checkout;
}
