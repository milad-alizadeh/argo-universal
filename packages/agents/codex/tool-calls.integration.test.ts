import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FileUpdateChange } from './protocol.gen';
import { toToolCall } from './tool-calls';

describe('file Tool call patches', (): void => {
  let checkout: string;
  beforeEach((): void => {
    checkout = mkdtempSync(join(tmpdir(), 'agent-patch-'));
    execFileSync('git', ['init', '--quiet'], { cwd: checkout });
  });
  afterEach((): void => rmSync(checkout, { recursive: true, force: true }));

  const applyChange = (
    change: FileUpdateChange,
  ): import('@repo/contracts').DiffChange[] => {
    const row = toToolCall(
      {
        type: 'fileChange',
        id: 'edit',
        status: 'completed',
        changes: [change],
      },
      'settled',
    );
    const content = row.content.find(
      (
        entry,
      ): entry is {
        type: 'diff';
        changes: {
          operation: 'add' | 'delete' | 'modify' | 'move';
          path: string;
          oldPath?: string;
          oldText?: string;
          newText?: string;
        }[];
        patch?: { format: 'git_patch'; text: string };
      } => entry.type === 'diff',
    );
    if (!content?.patch) throw new Error('The Tool call has no patch.');
    execFileSync('git', ['apply', '--whitespace=nowarn', '-'], {
      cwd: checkout,
      input: content.patch.text,
    });
    return content.changes;
  };

  const contents = [
    { name: 'empty content', text: '' },
    { name: 'one newline', text: '\n' },
    { name: 'a final newline', text: 'first\nsecond\n' },
    { name: 'no final newline', text: 'first\nsecond' },
  ];

  it.each([
    'space name.txt',
    'tab\tname.txt',
    'line\nname.txt',
    'return\rname.txt',
    'quote"name.txt',
    'back\\slash.txt',
    'accent-é.txt',
    'accent-é\tname.txt',
  ])('preserves path %j when adding, moving and deleting', (filePath): void => {
    const text = 'content\n';
    applyChange({ path: filePath, kind: { type: 'add' }, diff: text });
    expect(readFileSync(join(checkout, filePath), 'utf8')).toBe(text);
    const movedPath = `moved-${filePath}`;
    applyChange({
      path: filePath,
      kind: { type: 'update', move_path: movedPath },
      diff: '',
    });
    expect(existsSync(join(checkout, filePath))).toBe(false);
    expect(readFileSync(join(checkout, movedPath), 'utf8')).toBe(text);
    applyChange({ path: movedPath, kind: { type: 'delete' }, diff: text });
    expect(existsSync(join(checkout, movedPath))).toBe(false);
  });

  it.each(contents)(
    'adds a file with $name without changing its bytes',
    ({ text }): void => {
      expect(
        applyChange({ path: 'file.txt', kind: { type: 'add' }, diff: text }),
      ).toEqual([{ operation: 'add', path: 'file.txt', newText: text }]);
      expect(readFileSync(join(checkout, 'file.txt'), 'utf8')).toBe(text);
    },
  );

  it.each(contents)('deletes a file with $name', ({ text }): void => {
    writeFileSync(join(checkout, 'file.txt'), text);
    expect(
      applyChange({ path: 'file.txt', kind: { type: 'delete' }, diff: text }),
    ).toEqual([{ operation: 'delete', path: 'file.txt', oldText: text }]);
    expect(existsSync(join(checkout, 'file.txt'))).toBe(false);
  });

  it.each(contents)(
    'moves a file with $name without changing its bytes',
    ({ text }): void => {
      writeFileSync(join(checkout, 'old.txt'), text);
      expect(
        applyChange({
          path: 'old.txt',
          kind: { type: 'update', move_path: 'new.txt' },
          diff: '',
        }),
      ).toEqual([{ operation: 'move', path: 'new.txt', oldPath: 'old.txt' }]);
      expect(existsSync(join(checkout, 'old.txt'))).toBe(false);
      expect(readFileSync(join(checkout, 'new.txt'), 'utf8')).toBe(text);
    },
  );

  it.each([
    {
      name: 'a final newline',
      before: 'before\n',
      after: 'after\n',
      diff: '@@ -1 +1 @@\n-before\n+after\n',
    },
    {
      name: 'no final newline',
      before: 'before',
      after: 'after',
      diff: '@@ -1 +1 @@\n-before\n\\ No newline at end of file\n+after\n\\ No newline at end of file\n',
    },
  ])('moves and edits a file with $name', ({ before, after, diff }): void => {
    writeFileSync(join(checkout, 'old.txt'), before);
    applyChange({
      path: 'old.txt',
      kind: { type: 'update', move_path: 'new.txt' },
      diff,
    });
    expect(existsSync(join(checkout, 'old.txt'))).toBe(false);
    expect(readFileSync(join(checkout, 'new.txt'), 'utf8')).toBe(after);
  });
});
