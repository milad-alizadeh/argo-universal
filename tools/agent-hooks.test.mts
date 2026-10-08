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

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const BLOCKED = 2;
const anyViolation = 'export const value: any = 1;\n';
const unformattedJson = '{"a":1}\n';

let root: string;

function git(...args: string[]) {
  spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}

function runHook(command: string, input: unknown) {
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
const fileEdit = (file: string) => ({
  cwd: root,
  tool_name: 'Edit',
  tool_input: { file_path: file },
});
const patchEdit = (file: string) => ({
  cwd: root,
  tool_name: 'apply_patch',
  tool_input: {
    command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch`,
  },
});
const patchArray = (file: string) => ({
  cwd: root,
  tool_name: 'apply_patch',
  tool_input: {
    command: [
      'apply_patch',
      `*** Begin Patch\n*** Add File: ${file}\n+x\n*** End Patch`,
    ],
  },
});

beforeAll(() => {
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
  writeFileSync(path.join(root, 'scratch.ts'), anyViolation);
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

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('after-edit', () => {
  it('reports a finding from an Edit call and blocks', () => {
    const result = runHook('after-edit', fileEdit('scratch.ts'));
    expect(result.status).toBe(BLOCKED);
    expect(result.stderr).toContain('no-explicit-any');
    expect(result.stderr).toContain('docs/agents/hooks.md');
  });

  it('reports the same finding from an apply_patch call', () => {
    const result = runHook('after-edit', patchEdit('scratch.ts'));
    expect(result.status).toBe(BLOCKED);
    expect(result.stderr).toContain('no-explicit-any');
  });

  it('reports a finding through a Checkout directory alias', () => {
    const alias = path.join(root, 'checkout-alias');
    symlinkSync(root, alias, 'dir');
    const result = runHook('after-edit', {
      ...fileEdit('scratch.ts'),
      cwd: alias,
    });
    expect(result.status).toBe(BLOCKED);
    expect(result.stderr).toContain('no-explicit-any');
  });

  it('reads an apply_patch command given as an array', () => {
    writeFileSync(path.join(root, 'added.ts'), anyViolation);
    const result = runHook('after-edit', patchArray('added.ts'));
    expect(result.status).toBe(BLOCKED);
  });

  it('blocks on a warning and on an unused disable directive', () => {
    // Split so check-comments does not read the string as a directive.
    const directive = ['oxlint', 'disable-next-line no-debugger'].join('-');
    writeFileSync(
      path.join(root, 'noisy.ts'),
      `console.log('x');\n// ${directive}\nexport const y = 1;\n`,
    );
    const result = runHook('after-edit', fileEdit('noisy.ts'));
    expect(result.status).toBe(BLOCKED);
    expect(result.stderr).toContain('no-console');
    expect(result.stderr).toContain('unused-disable-directive');
    rmSync(path.join(root, 'noisy.ts'));
  });

  it('passes a clean file', () => {
    expect(runHook('after-edit', fileEdit('clean.ts')).status).toBe(0);
  });

  it('skips unused imports, which the next edit often uses', () => {
    expect(runHook('after-edit', fileEdit('unused.ts')).status).toBe(0);
  });

  it('never rewrites the edited file', () => {
    writeFileSync(path.join(root, 'crooked.json'), unformattedJson);
    runHook('after-edit', fileEdit('crooked.json'));
    expect(readFileSync(path.join(root, 'crooked.json'), 'utf8')).toBe(
      unformattedJson,
    );
  });

  it('ignores a path outside the root', () => {
    expect(
      runHook('after-edit', {
        cwd: root,
        tool_input: { file_path: '/etc/hostname' },
      }).status,
    ).toBe(0);
  });

  it('ignores an apply_patch that deletes the file', () => {
    const deletion = {
      cwd: root,
      tool_input: {
        command: '*** Begin Patch\n*** Delete File: scratch.ts\n*** End Patch',
      },
    };
    expect(runHook('after-edit', deletion).status).toBe(0);
  });

  it('skips input of an unknown shape', () => {
    const result = runHook('after-edit', []);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('unrecognised hook input; skipped');
  });

  it('skips input that is not JSON', () => {
    expect(runHook('after-edit', 'not json').status).toBe(0);
  });
});

describe('command', () => {
  it('rejects an unknown command with a usage line', () => {
    const result = runHook('nonsense', {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('usage');
  });
});

describe('before-stop', () => {
  it('exits at once when stop_hook_active is set', () => {
    writeFileSync(path.join(root, 'blocked.ts'), anyViolation);
    expect(runHook('before-stop', { stop_hook_active: true }).status).toBe(0);
  });

  it('blocks on a finding in a changed file, and a second stop passes', () => {
    const first = runHook('before-stop', {
      cwd: root,
      stop_hook_active: false,
    });
    expect(first.status).toBe(BLOCKED);
    expect(first.stderr).toContain('blocked.ts');
    expect(
      runHook('before-stop', { cwd: root, stop_hook_active: true }).status,
    ).toBe(0);
  });

  it('formats changed files', () => {
    rmSync(path.join(root, 'blocked.ts'));
    rmSync(path.join(root, 'scratch.ts'));
    rmSync(path.join(root, 'added.ts'));
    rmSync(path.join(root, 'unused.ts'));
    const result = runHook('before-stop', { cwd: root });
    expect(result.status).toBe(0);
    expect(readFileSync(path.join(root, 'crooked.json'), 'utf8')).toBe(
      '{ "a": 1 }\n',
    );
  });

  it('exits at once when no checked file changed', () => {
    git('add', '.');
    git('commit', '-q', '-m', 'second');
    writeFileSync(path.join(root, 'notes.md'), 'notes\n');
    expect(runHook('before-stop', { cwd: root }).status).toBe(0);
  });
});
