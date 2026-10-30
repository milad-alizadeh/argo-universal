import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveExecutable } from '@repo/executables';

const source = fileURLToPath(new URL('..', import.meta.url));

export const file = 'packages/client/src/example.tsx';

export const rule = 'argo/kit-styling';

export const invalid =
  'import { Button } from \'@repo/kit/primitives/actions/button\';\n\n<Button className="x" />;\n';

export const valid =
  'import { Button } from \'@repo/kit/primitives/actions/button\';\n\n<Button label="Save" />;\n';

export function write(root: string, path: string, text: string): void {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, text);
}

function copy(root: string, path: string): void {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(source, path), destination, { recursive: true });
}

function git(root: string, ...args: string[]): void {
  const result = spawnSync(resolveExecutable('git'), args, {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) throw new Error(result.stderr);
}

function link(root: string, path: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  symlinkSync(join(source, path), join(root, path), 'dir');
}

const lintConfig = JSON.stringify({
  extends: ['./tooling/oxlint/prickles.json', './tooling/oxlint/argo.json'],
  ignorePatterns: ['tools/**', 'tooling/**'],
});

const typescriptConfig = JSON.stringify({
  include: ['packages/client/src/**/*'],
  compilerOptions: { jsx: 'preserve' },
});

const allowlist = JSON.stringify({
  overrides: [{ files: [file], rules: { [rule]: 'off' } }],
});

function config(root: string): void {
  write(root, '.oxlintrc.json', lintConfig);
  write(root, 'tsconfig.json', typescriptConfig);
  write(root, 'package.json', '{"type":"module"}');
  write(root, '.gitignore', 'node_modules\n');
  write(root, 'tooling/oxlint/kit-styling-allowlist.json', allowlist);
}

function commitBaseline(root: string): void {
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'test');
  git(root, 'add', 'tooling/oxlint/kit-styling-allowlist.json');
  git(root, 'commit', '-q', '-m', 'baseline');
  git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
}

const fixtureFiles = [
  'tooling/oxlint',
  'tools/check-rule-allowlists.mts',
  'tools/lint-findings.mts',
  'tools/measure-allowlist.mts',
  'tools/parse-jsonc.mts',
  'tools/rule-allowlist.mts',
];

export function fixture(): string {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), 'argo-allowlist-test-')),
  );

  for (const path of fixtureFiles) copy(root, path);
  link(root, 'node_modules');
  link(root, 'tools/node_modules');
  config(root);
  write(root, file, invalid);
  commitBaseline(root);

  return root;
}

interface RunResult {
  status: number | null;
  output: string;
}

export function run(
  root: string,
  executable: string,
  args: string[],
): RunResult {
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) throw result.error;

  return { status: result.status, output: result.stdout + result.stderr };
}
