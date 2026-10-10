import type { DiffChange, ToolCallDiff } from '@repo/contracts';
import { parsePatch, structuredPatch } from 'diff';

export interface DiffLine {
  kind: 'context' | 'added' | 'removed' | 'note';
  number: number | null;
  text: string;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff extends Pick<
  DiffChange,
  'path' | 'oldPath' | 'operation'
> {
  added: number;
  removed: number;
  hunks: DiffHunk[];
}

const matchingPath = (path: string): string => path.replace(/^\//, '');

// Both recorded patches and ACP text changes become the same diff for the Feed and Changed files.
export function toFileDiffs(diff: ToolCallDiff): FileDiff[] {
  const patches = diff.patch ? parsePatch(diff.patch.text) : [];
  return diff.changes.map((change) => {
    const patch =
      patches.find((patch) =>
        [patch.newFileName, patch.oldFileName].some(
          (path) =>
            path &&
            [change.path, change.oldPath].some(
              (target) =>
                target &&
                matchingPath(
                  patch.isGit ? path.replace(/^[ab]\//, '') : path,
                ) === matchingPath(target),
            ),
        ),
      ) ??
      structuredPatch(
        change.oldPath ?? change.path,
        change.path,
        change.oldText ?? '',
        change.newText ?? '',
        undefined,
        undefined,
        { context: 3 },
      );
    let added = 0;
    let removed = 0;
    const hunks = patch.hunks.map((hunk): DiffHunk => {
      let oldNumber = hunk.oldStart;
      let newNumber = hunk.newStart;
      const lines = hunk.lines.map((line): DiffLine => {
        if (line.startsWith('+')) {
          added += 1;
          return { kind: 'added', number: newNumber++, text: line.slice(1) };
        }
        if (line.startsWith('-')) {
          removed += 1;
          return { kind: 'removed', number: oldNumber++, text: line.slice(1) };
        }
        if (line.startsWith('\\'))
          return { kind: 'note', number: null, text: line };
        oldNumber += 1;
        return { kind: 'context', number: newNumber++, text: line.slice(1) };
      });
      return {
        header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        lines,
      };
    });
    return {
      path: change.path,
      oldPath: change.oldPath,
      operation: change.operation,
      added,
      removed,
      hunks,
    };
  });
}
