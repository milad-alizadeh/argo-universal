import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
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
import { resolveExecutable } from '@repo/executables';
import { afterAll, beforeAll } from 'vitest';

export const scratchSourceFile = 'scratch.ts';

export const afterEditHook = 'after-edit';

export const invalidJsonFile = 'crooked.json';

export const beforeStopHook = 'before-stop';

export const blockedSourceFile = 'blocked.ts';

export const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

export const BLOCKED = 2;

export const hookScripts = [
  'agent-hooks.mts',
  'agent-hook-run.mts',
  'hook-checks.mts',
];

export const anyViolation = 'export const value: any = 1;\n';

export const explicitAnyRule = 'no-explicit-any';

export const unformattedJson = '{"a":1}\n';

export let root: string;

export function git(...args: string[]): void {
  spawnSync(resolveExecutable('git'), args, { cwd: root, encoding: 'utf8' });
}

// A recorded hook input: an Edit or Write call carries file_path; an apply_patch call carries a command.
export type RecordedInput = {
  cwd?: string;
  tool_name?: string;
  stop_hook_active?: boolean;
  tool_input?: { file_path?: string; command?: string | string[] };
};

// What a test pipes to a hook: a recorded input, or input the hook must skip.
type HookStdin = RecordedInput | [] | string;

type HookRun = { status: number | null; stderr: string; stdout: string };

export function runHook(command: string, input: HookStdin): HookRun {
  const stdin = typeof input === 'string' ? input : JSON.stringify(input);

  const result = executeHook(command, stdin);

  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  };
}

function executeHook(command: string, stdin: string): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [path.join(root, 'tools/agent-hooks.mts'), command],
    {
      cwd: root,
      input: stdin,
      encoding: 'utf8',
    },
  );
}

export const fileEdit = (file: string): RecordedInput => ({
  cwd: root,
  tool_name: 'Edit',
  tool_input: { file_path: file },
});

export const patchEdit = (file: string): RecordedInput => ({
  cwd: root,
  tool_name: 'apply_patch',
  tool_input: {
    command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch`,
  },
});

export const patchArray = (file: string): RecordedInput => ({
  cwd: root,
  tool_name: 'apply_patch',
  tool_input: {
    command: [
      'apply_patch',
      `*** Begin Patch\n*** Add File: ${file}\n+x\n*** End Patch`,
    ],
  },
});

function copyHooks(): void {
  mkdirSync(path.join(root, 'tools'));

  for (const script of hookScripts)
    cpSync(
      path.join(repositoryRoot, 'tools', script),
      path.join(root, 'tools', script),
    );
  linkDependencies();
}

function linkDependencies(): void {
  symlinkSync(
    path.join(repositoryRoot, 'tools/node_modules'),
    path.join(root, 'tools/node_modules'),
  );
  symlinkSync(
    path.join(repositoryRoot, 'node_modules'),
    path.join(root, 'node_modules'),
  );
}

function writeConfig(): void {
  writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n');
  writeFileSync(
    path.join(root, '.oxlintrc.json'),
    JSON.stringify({
      options: { reportUnusedDisableDirectives: 'error' },
      rules: {
        'typescript/no-explicit-any': 'error',
        'no-console': 'warn',
        'no-unused-vars': 'error',
      },
    }),
  );
  writeFileSync(path.join(root, '.oxfmtrc.json'), '{ "singleQuote": true }\n');
}

function writeFixtureFiles(): void {
  writeFileSync(path.join(root, scratchSourceFile), anyViolation);
  writeFileSync(path.join(root, 'clean.ts'), 'export const value = 1;\n');
  writeFileSync(
    path.join(root, 'unused.ts'),
    "import { a } from './clean.ts';\n",
  );
}

function initializeGit(): void {
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  writeFileSync(path.join(root, '.gitignore'), 'node_modules\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
}

beforeAll((): void => {
  root = mkdtempSync(path.join(tmpdir(), 'agent-hooks-'));
  copyHooks();
  writeConfig();
  writeFixtureFiles();
  initializeGit();
});

afterAll((): void => {
  rmSync(root, { recursive: true, force: true });
});
