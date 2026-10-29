import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  anyViolation,
  beforeStopHook,
  BLOCKED,
  blockedSourceFile,
  git,
  hookScripts,
  invalidJsonFile,
  repositoryRoot,
  root,
  runHook,
  scratchSourceFile,
  unformattedJson,
} from './agent-hooks.mocks';

// These files were made by the after-edit cases before the stop cases ran.
beforeAll((): void => {
  writeFileSync(path.join(root, 'added.ts'), anyViolation);
  writeFileSync(path.join(root, invalidJsonFile), unformattedJson);
});

describe('a Checkout without dependencies', (): void => {
  it('passes quietly, as there is nothing to check with', (): void => {
    const bare = mkdtempSync(path.join(tmpdir(), 'agent-hooks-bare-'));
    mkdirSync(path.join(bare, 'tools'));

    for (const script of hookScripts)
      cpSync(
        path.join(repositoryRoot, 'tools', script),
        path.join(bare, 'tools', script),
      );
    writeFileSync(path.join(bare, blockedSourceFile), anyViolation);

    const result = spawnSync(
      process.execPath,
      [path.join(bare, 'tools/agent-hooks.mts'), beforeStopHook],
      { cwd: bare, input: '{}', encoding: 'utf8' },
    );

    rmSync(bare, { recursive: true, force: true });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
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
