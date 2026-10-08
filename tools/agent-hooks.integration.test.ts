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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const scratchSourceFile = 'scratch.ts';
const afterEditHook = 'after-edit';
const invalidJsonFile = 'crooked.json';
const beforeStopHook = 'before-stop';
const blockedSourceFile = 'blocked.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const BLOCKED = 2;
const anyViolation = 'export const value: any = 1;\n';
const explicitAnyRule = 'no-explicit-any';
const unformattedJson = '{"a":1}\n';

let root: string;

function git(...args: string[]): void {
  spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}

function runHook(
  command: string,
  input: unknown,
): { status: number | null; stderr: string } {
  const stdin = typeof input === 'string' ? input : JSON.stringify(input);
  const result = spawnSync(
    'node',
    [path.join(root, 'tools/agent-hooks.mts'), command],
    {
      cwd: root,
      input: stdin,
      encoding: 'utf8',
    },
  );
  return { status: result.status, stderr: result.stderr };
}

// Recorded input shapes: an Edit or Write call carries file_path; an apply_patch call carries a command.
const fileEdit = (
  file: string,
): { cwd: string; tool_name: string; tool_input: { file_path: string } } => ({
  cwd: root,
  tool_name: 'Edit',
  tool_input: { file_path: file },
});
const patchEdit = (
  file: string,
): { cwd: string; tool_name: string; tool_input: { command: string } } => ({
  cwd: root,
  tool_name: 'apply_patch',
  tool_input: {
    command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch`,
  },
});
const patchArray = (
  file: string,
): { cwd: string; tool_name: string; tool_input: { command: string[] } } => ({
  cwd: root,
  tool_name: 'apply_patch',
  tool_input: {
    command: [
      'apply_patch',
      `*** Begin Patch\n*** Add File: ${file}\n+x\n*** End Patch`,
    ],
  },
});

beforeAll((): void => {
  root = mkdtempSync(path.join(tmpdir(), 'agent-hooks-'));
  mkdirSync(path.join(root, 'tools'));
  for (const script of ['agent-hooks.mts', 'hook-checks.mts'])
    cpSync(
      path.join(repositoryRoot, 'tools', script),
      path.join(root, 'tools', script),
    );
  symlinkSync(
    path.join(repositoryRoot, 'node_modules'),
    path.join(root, 'node_modules'),
  );
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
  writeFileSync(path.join(root, scratchSourceFile), anyViolation);
  writeFileSync(path.join(root, 'clean.ts'), 'export const value = 1;\n');
  writeFileSync(
    path.join(root, 'unused.ts'),
    "import { a } from './clean.ts';\n",
  );
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  writeFileSync(path.join(root, '.gitignore'), 'node_modules\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
});

afterAll((): void => {
  rmSync(root, { recursive: true, force: true });
});

describe('after-edit', (): void => {
  it.each([
    [
      'an Edit call',
      (): ReturnType<typeof fileEdit> => fileEdit(scratchSourceFile),
    ],
    [
      'an apply_patch call',
      (): ReturnType<typeof patchEdit> => patchEdit(scratchSourceFile),
    ],
    [
      'an apply_patch command array',
      (): ReturnType<typeof patchArray> => {
        writeFileSync(path.join(root, 'added.ts'), anyViolation);
        return patchArray('added.ts');
      },
    ],
  ])('reports a finding from %s and blocks', (_name, edit): void => {
    const result = runHook(afterEditHook, edit());
    expect(result.status).toBe(BLOCKED);
    expect(result.stderr).toContain(explicitAnyRule);
    expect(result.stderr).toContain('docs/agents/hooks.md');
  });

  it('reports a finding through a Checkout directory alias', (): void => {
    const alias = path.join(root, 'checkout-alias');
    symlinkSync(root, alias, 'dir');
    const result = runHook(afterEditHook, {
      ...fileEdit(scratchSourceFile),
      cwd: alias,
    });
    expect(result.status).toBe(BLOCKED);
    expect(result.stderr).toContain(explicitAnyRule);
  });

  it('blocks on a warning and on an unused disable directive', (): void => {
    // Split so check-comments does not read the string as a directive.
    const directive = ['oxlint', 'disable-next-line no-debugger'].join('-');
    writeFileSync(
      path.join(root, 'noisy.ts'),
      `console.log('x');\n// ${directive}\nexport const y = 1;\n`,
    );
    const result = runHook(afterEditHook, fileEdit('noisy.ts'));
    expect(result.status).toBe(BLOCKED);
    expect(result.stderr).toContain('no-console');
    expect(result.stderr).toContain('unused-disable-directive');
    rmSync(path.join(root, 'noisy.ts'));
  });

  it('passes a clean file', (): void => {
    expect(runHook(afterEditHook, fileEdit('clean.ts')).status).toBe(0);
  });

  it('skips unused imports, which the next edit often uses', (): void => {
    expect(runHook(afterEditHook, fileEdit('unused.ts')).status).toBe(0);
  });

  it('never rewrites the edited file', (): void => {
    writeFileSync(path.join(root, invalidJsonFile), unformattedJson);
    runHook(afterEditHook, fileEdit(invalidJsonFile));
    expect(readFileSync(path.join(root, invalidJsonFile), 'utf8')).toBe(
      unformattedJson,
    );
  });

  it('ignores a path outside the root', (): void => {
    expect(
      runHook(afterEditHook, {
        cwd: root,
        tool_input: { file_path: '/etc/hostname' },
      }).status,
    ).toBe(0);
  });

  it('ignores an apply_patch that deletes the file', (): void => {
    const deletion = {
      cwd: root,
      tool_input: {
        command: '*** Begin Patch\n*** Delete File: scratch.ts\n*** End Patch',
      },
    };
    expect(runHook(afterEditHook, deletion).status).toBe(0);
  });

  it('skips input of an unknown shape', (): void => {
    const result = runHook(afterEditHook, []);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('unrecognised hook input; skipped');
  });

  it('skips input that is not JSON', (): void => {
    expect(runHook(afterEditHook, 'not json').status).toBe(0);
  });
});

describe('command', (): void => {
  it('rejects an unknown command with a usage line', (): void => {
    const result = runHook('nonsense', {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('usage');
  });
});

describe('before-stop', (): void => {
  it('exits at once when stop_hook_active is set', (): void => {
    writeFileSync(path.join(root, blockedSourceFile), anyViolation);
    expect(runHook(beforeStopHook, { stop_hook_active: true }).status).toBe(0);
  });

  it('blocks on a finding in a changed file, and a second stop passes', (): void => {
    const first = runHook(beforeStopHook, {
      cwd: root,
      stop_hook_active: false,
    });
    expect(first.status).toBe(BLOCKED);
    expect(first.stderr).toContain(blockedSourceFile);
    expect(
      runHook(beforeStopHook, { cwd: root, stop_hook_active: true }).status,
    ).toBe(0);
  });

  it('formats changed files', (): void => {
    rmSync(path.join(root, blockedSourceFile));
    rmSync(path.join(root, scratchSourceFile));
    rmSync(path.join(root, 'added.ts'));
    rmSync(path.join(root, 'unused.ts'));
    const result = runHook(beforeStopHook, { cwd: root });
    expect(result.status).toBe(0);
    expect(readFileSync(path.join(root, invalidJsonFile), 'utf8')).toBe(
      '{ "a": 1 }\n',
    );
  });

  it('exits at once when no checked file changed', (): void => {
    git('add', '.');
    git('commit', '-q', '-m', 'second');
    writeFileSync(path.join(root, 'notes.md'), 'notes\n');
    expect(runHook(beforeStopHook, { cwd: root }).status).toBe(0);
  });
});
