import {
  SessionSnapshot,
  SessionChangesOutput,
  SessionDiffOutput,
} from '@repo/contracts';
import { changesMocks, recordedFeedMocks } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';

describe.each(Object.entries(changesMocks))(
  'the %s changes mock',
  (_, changesMock): void => {
    it('satisfies the changes and diff contracts', (): void => {
      expect(SessionChangesOutput.parse(changesMock.files)).toEqual(
        changesMock.files,
      );
      for (const file of changesMock.files)
        expect(SessionDiffOutput.parse(changesMock.diffs[file.path])).toEqual(
          changesMock.diffs[file.path],
        );
    });

    it('counts each diff its own added and removed lines', (): void => {
      expect(changesMock.summary.files).toBe(changesMock.files.length);
      for (const file of changesMock.files) {
        const lines =
          changesMock.diffs[file.path]?.patch.text.split('\n') ?? [];
        const isBinary = lines.some((line): boolean =>
          line.startsWith('Binary files '),
        );
        const countChangedLines = (sign: string, header: string): number =>
          lines.filter(
            (line): boolean =>
              line.startsWith(sign) && !line.startsWith(header),
          ).length;
        expect(changesMock.diffs[file.path]?.file).toEqual(file);
        expect(file.additions).toBe(
          isBinary ? null : countChangedLines('+', '+++ '),
        );
        expect(file.deletions).toBe(
          isBinary ? null : countChangedLines('-', '--- '),
        );
      }
    });
  },
);

it('covers no changes, a few files, many files, a large diff and a binary file', (): void => {
  const { none, fewFiles, manyFiles, largeDiff, binaryFile } = changesMocks;
  expect(none.files).toEqual([]);
  expect(none.summary).toEqual({ files: 0, additions: 0, deletions: 0 });
  expect(fewFiles.summary).toEqual({ files: 4, additions: 8, deletions: 5 });
  expect(
    fewFiles.files
      .map((file): 'add' | 'delete' | 'modify' | 'move' => file.operation)
      .sort(),
  ).toEqual(['add', 'delete', 'modify', 'move']);
  expect(manyFiles.files.length).toBeGreaterThanOrEqual(50);
  expect(
    largeDiff.summary.additions + largeDiff.summary.deletions,
  ).toBeGreaterThanOrEqual(2000);
  expect(binaryFile.files).toContainEqual(
    expect.objectContaining({ additions: null, deletions: null }),
  );
});

it('gives every recorded Feed snapshot a changes summary', (): void => {
  for (const { snapshot } of recordedFeedMocks)
    expect(SessionSnapshot.shape.changes.parse(snapshot.changes)).toEqual(
      snapshot.changes,
    );
});
