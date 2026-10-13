import type { DiffChange, ToolCallDiff } from '@repo/contracts';
import { parsePatch, type StructuredPatch, structuredPatch } from 'diff';
import { changedLineCounts, type DiffHunk, toDiffHunk } from './diff-hunks';

export type { DiffLine } from './diff-hunks';

export interface FileDiff extends Pick<
  DiffChange,
  'path' | 'oldPath' | 'operation'
> {
  added: number;
  removed: number;
  hunks: DiffHunk[];
}

const matchingPath = (path: string): string => path.replace(/^\//, '');

function patchPaths(patch: StructuredPatch): string[] {
  return [patch.newFileName, patch.oldFileName]
    .filter(isPath)
    .map((path) => (patch.isGit ? path.replace(/^[ab]\//, '') : path));
}

function matchesChange(patch: StructuredPatch, change: DiffChange): boolean {
  const paths = new Set(
    [change.path, change.oldPath].filter(isPath).map(matchingPath),
  );
  return patchPaths(patch).some((path) => paths.has(matchingPath(path)));
}

function isPath(path: string | undefined): path is string {
  return Boolean(path);
}

function changePatch(change: DiffChange): StructuredPatch {
  return structuredPatch(
    oldPath(change),
    change.path,
    change.oldText ?? '',
    change.newText ?? '',
    undefined,
    undefined,
    { context: 3 },
  );
}

function toFileDiff(change: DiffChange, patches: StructuredPatch[]): FileDiff {
  const patch =
    patches.find((patch) => matchesChange(patch, change)) ??
    changePatch(change);
  const hunks = patch.hunks.map(toDiffHunk);
  return {
    path: change.path,
    oldPath: change.oldPath,
    operation: change.operation,
    ...changedLineCounts(hunks),
    hunks,
  };
}

export function toFileDiffs(diff: ToolCallDiff): FileDiff[] {
  const patches = diff.patch ? parsePatch(diff.patch.text) : [];
  return diff.changes.map((change) => toFileDiff(change, patches));
}

function oldPath(change: DiffChange): string {
  return change.oldPath ?? change.path;
}
