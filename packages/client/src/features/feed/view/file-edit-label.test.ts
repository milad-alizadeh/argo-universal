import { describe, expect, it } from 'vitest';
import type { FileDiff } from './file-diff';
import { fileEditLabel, fileName } from './file-edit-label';

const diff = (file: Partial<FileDiff>): FileDiff => ({
  path: '/project/notes.md',
  operation: 'add',
  added: 0,
  removed: 0,
  hunks: [],
  ...file,
});

describe('fileName', () => {
  it('keeps the name at the end of an absolute path', () => {
    expect(fileName('/Users/someone/argo/worktrees/585ad15d/notes.md')).toBe(
      'notes.md',
    );
  });

  it('keeps a bare name as it is', () => {
    expect(fileName('notes.md')).toBe('notes.md');
  });
});

describe('fileEditLabel', () => {
  it('names the file and its added lines, not the path it sits at', () => {
    const label = fileEditLabel(
      diff({ path: '/project/notes.md', operation: 'add', added: 1 }),
    );

    expect(label).toBe('Added notes.md, plus 1');
  });

  it('speaks both counts of an edited file', () => {
    expect(
      fileEditLabel(
        diff({
          path: '/project/hello.txt',
          operation: 'modify',
          added: 1,
          removed: 1,
        }),
      ),
    ).toBe('Edited hello.txt, plus 1, minus 1');
  });

  it('speaks the removed lines of a deleted file', () => {
    expect(
      fileEditLabel(
        diff({ path: '/repo/legacy.txt', operation: 'delete', removed: 3 }),
      ),
    ).toBe('Deleted legacy.txt, minus 3');
  });

  it('names both files of a move, as the row draws them', () => {
    expect(
      fileEditLabel(
        diff({
          oldPath: '/repo/old.md',
          path: '/repo/new.md',
          operation: 'move',
        }),
      ),
    ).toBe('Moved old.md to new.md');
  });

  it('leaves out a count the row does not draw', () => {
    expect(
      fileEditLabel(
        diff({ path: '/repo/empty.md', operation: 'modify', added: 0 }),
      ),
    ).toBe('Edited empty.md');
  });
});
