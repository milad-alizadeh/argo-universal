import { readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  afterEditHook,
  anyViolation,
  BLOCKED,
  explicitAnyRule,
  fileEdit,
  invalidJsonFile,
  patchArray,
  patchEdit,
  type RecordedInput,
  root,
  runHook,
  scratchSourceFile,
  unformattedJson,
} from './agent-hooks.mocks';

describe('after-edit', (): void => {
  it.each([
    ['an Edit call', (): RecordedInput => fileEdit(scratchSourceFile)],
    ['an apply_patch call', (): RecordedInput => patchEdit(scratchSourceFile)],
    [
      'an apply_patch command array',
      (): RecordedInput => {
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
