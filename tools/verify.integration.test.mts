import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

const verifyScripts = ['verify.mts', 'verify-scope.mts', 'hook-checks.mts'];

let root: string;

function git(...args: string[]): void {
  spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}

function write(file: string, text: string): void {
  writeFileSync(path.join(root, file), text);
}

function link(target: string): void {
  symlinkSync(path.join(repositoryRoot, target), path.join(root, target));
}

type VerifyRun = { status: number | null; output: string };

function runVerify(): VerifyRun {
  const result = spawnSync('node', [path.join(root, 'tools/verify.mts')], {
    cwd: root,
    encoding: 'utf8',
  });

  return { status: result.status, output: result.stdout + result.stderr };
}

// A checkout on main with one module and the test that imports it.
beforeEach((): void => {
  root = mkdtempSync(path.join(tmpdir(), 'verify-'));
  mkdirSync(path.join(root, 'tools'));

  for (const script of verifyScripts)
    cpSync(
      path.join(repositoryRoot, 'tools', script),
      path.join(root, 'tools', script),
    );
  link('tools/node_modules');
  link('node_modules');
  write('package.json', '{ "type": "module" }\n');
  write('.oxfmtrc.json', '{ "singleQuote": true }\n');
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
    write('sum.mjs', 'export const sum = (a, b) => b + a;\n');

    const result = runVerify();

    expect(result.status).toBe(0);
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

    expect(runVerify().status).toBe(1);
  });
});
