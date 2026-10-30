import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveExecutable } from '@repo/executables';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifyScripts } from './verify.mocks.mts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

const reorderedSum = 'export const sum = (a, b) => b + a;\n';

const generatedProcedureFile = 'packages/engine/src/operations/router.gen.ts';

// verify runs the Registry validators' own --check beside the Operation procedures'.
const registryValidatorGenerator =
  'packages/contracts/tools/registry/generate-validators.mts';

let root: string;

function git(...args: string[]): void {
  const result = spawnSync(resolveExecutable('git'), args, {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) throw new Error(result.stderr);
}

function write(file: string, text: string): void {
  writeFileSync(path.join(root, file), text);
}

function copy(file: string): void {
  const destination = path.join(root, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(path.join(repositoryRoot, file), destination);
}

function link(target: string): void {
  mkdirSync(path.dirname(path.join(root, target)), { recursive: true });
  symlinkSync(path.join(repositoryRoot, target), path.join(root, target));
}

type VerifyRun = { status: number | null; output: string };

function runVerify(): VerifyRun {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'tools/verify.mts')],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  return { status: result.status, output: result.stdout + result.stderr };
}

// A checkout on main with one module and the test that imports it.
beforeEach((): void => {
  root = mkdtempSync(path.join(tmpdir(), 'verify-'));
  mkdirSync(path.join(root, 'tools'));

  for (const script of verifyScripts) copy(`tools/${script}`);
  copy(generatedProcedureFile);
  copy('.oxfmtrc.json');
  link(registryValidatorGenerator);
  link('tools/node_modules');
  link('node_modules');
  write('package.json', '{ "type": "module" }\n');
  write('.gitignore', 'node_modules\n');
  write('sum.mjs', 'export const sum = (a, b) => a + b;\n');
  write(
    'sum.test.mjs',
    "import { expect, it } from 'vitest';\nimport { sum } from './sum.mjs';\n\nit('adds', () => {\n  expect(sum(1, 2)).toBe(3);\n});\n",
  );
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
});

afterEach((): void => {
  rmSync(root, { recursive: true, force: true });
});

describe('pnpm verify', (): void => {
  it('passes at once when nothing changed since main', (): void => {
    const result = runVerify();

    expect(result.status).toBe(0);
    expect(result.output).toContain('nothing changed since main');
  });

  it('runs the test that imports a changed file', (): void => {
    write('sum.mjs', reorderedSum);

    const result = runVerify();

    expect(result.status).toBe(0);
    expect(result.output).toContain('format, lint and types pass.');
    expect(result.output).toContain('running the 1 test files');
    expect(result.output).toContain('1 passed');
  });

  it('fails when a changed file is not formatted', (): void => {
    write('crooked.json', '{"a":1}\n');

    const result = runVerify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('crooked.json');
  });

  it('fails when a dependent test fails', (): void => {
    write('sum.mjs', 'export const sum = (a, b) => a - b;\n');

    const result = runVerify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('format, lint and types pass.');
    expect(result.output).toContain('1 failed');
  });

  it('fails when a new hand-written mutation is added', (): void => {
    write(
      'packages/engine/src/new-router.mjs',
      "import { initTRPC } from '@trpc/server';\n\nconst publicProcedure = initTRPC.create().procedure;\n\nexport const routes = {\n  erase: publicProcedure.mutation(() => null),\n};\n",
    );
    write('sum.mjs', reorderedSum);

    const result = runVerify();

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      'Add an Operation instead of the hand-written mutation erase.',
    );
    expect(result.output).not.toContain('Operation procedures are stale.');
    expect(result.output).toContain('1 passed');
  });

  it('fails when generated Operation procedures are stale before another file changes', (): void => {
    const generated = readFileSync(
      path.join(root, generatedProcedureFile),
      'utf8',
    );

    write(generatedProcedureFile, `${generated}\n// Stale fixture.\n`);
    git('add', generatedProcedureFile);
    git('commit', '-q', '-m', 'stale generated procedure');
    write('sum.mjs', reorderedSum);

    const result = runVerify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('Operation procedures are stale.');
    expect(result.output).not.toContain('Add an Operation instead');
    expect(result.output).toContain('1 passed');
  });

  it('fails when the Registry validators are stale', (): void => {
    rmSync(path.join(root, registryValidatorGenerator));
    write(
      registryValidatorGenerator,
      "if (process.argv.includes('--check')) throw new Error('Registry validators are stale.');\n",
    );
    write('sum.mjs', reorderedSum);

    const result = runVerify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('Registry validators are stale.');
    expect(result.output).toContain('1 passed');
  });
});
