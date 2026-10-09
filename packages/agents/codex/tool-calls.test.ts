import type { ToolCallContent } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { FileUpdateChange } from './protocol.gen';
import { toToolCall } from './tool-calls';

const diffContent = (
  change: FileUpdateChange,
): Extract<ToolCallContent, { type: 'diff' }> => {
  const row = toToolCall(
    { type: 'fileChange', id: 'edit', status: 'completed', changes: [change] },
    'settled',
  );
  const content = row.content.find(
    (entry): entry is Extract<ToolCallContent, { type: 'diff' }> =>
      entry.type === 'diff',
  );
  if (!content) throw new Error('Missing diff');
  return content;
};

describe('file Tool call translation', (): void => {
  it.each([
    'space name.txt',
    'tab\tname.txt',
    'line\nname.txt',
    'return\rname.txt',
    'quote"name.txt',
    'back\\slash.txt',
    'accent-é.txt',
    'accent-é\tname.txt',
  ])('preserves path %j in Argo add, move and delete values', (path): void => {
    expect(
      diffContent({ path, kind: { type: 'add' }, diff: 'content\n' }).changes,
    ).toEqual([{ operation: 'add', path, newText: 'content\n' }]);
    expect(
      diffContent({
        path,
        kind: { type: 'update', move_path: 'moved.txt' },
        diff: '',
      }).changes,
    ).toEqual([{ operation: 'move', path: 'moved.txt', oldPath: path }]);
    expect(
      diffContent({ path, kind: { type: 'delete' }, diff: 'content\n' })
        .changes,
    ).toEqual([{ operation: 'delete', path, oldText: 'content\n' }]);
  });
  it.each(['', '\n', 'first\nsecond\n', 'first\nsecond'])(
    'preserves provider file content %j',
    (text): void => {
      expect(
        diffContent({ path: 'file.txt', kind: { type: 'add' }, diff: text })
          .changes,
      ).toEqual([{ operation: 'add', path: 'file.txt', newText: text }]);
      expect(
        diffContent({ path: 'file.txt', kind: { type: 'delete' }, diff: text })
          .changes,
      ).toEqual([{ operation: 'delete', path: 'file.txt', oldText: text }]);
    },
  );
  it('adds a complete Git patch for a provider file addition', (): void => {
    expect(
      diffContent({
        path: 'file.txt',
        kind: { type: 'add' },
        diff: 'content\n',
      }).patch,
    ).toEqual({
      format: 'git_patch',
      text: 'diff --git a/file.txt b/file.txt\nnew file mode 100644\n--- /dev/null\n+++ b/file.txt\n@@ -0,0 +1,1 @@\n+content\n',
    });
  });
  it('keeps provider edit hunks in a move patch', (): void => {
    expect(
      diffContent({
        path: 'old.txt',
        kind: { type: 'update', move_path: 'new.txt' },
        diff: '@@ -1 +1 @@\n-before\n+after\n',
      }).patch,
    ).toEqual({
      format: 'git_patch',
      text: 'diff --git a/old.txt b/new.txt\nrename from old.txt\nrename to new.txt\n--- a/old.txt\n+++ b/new.txt\n@@ -1 +1 @@\n-before\n+after\n',
    });
  });
});
