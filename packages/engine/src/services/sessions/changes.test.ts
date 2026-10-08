import { changesMocks, recordedFeedMocks } from '@repo/api/mocks';
import { SessionSnapshot } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { unreachableServices } from '#mocks/services';
import { appRouter } from '../../engine/router';

const callerFor = (
  mock: (typeof changesMocks)[keyof typeof changesMocks],
): ReturnType<typeof appRouter.createCaller> =>
  appRouter.createCaller({
    services: unreachableServices({
      session: {
        changes: async (): Promise<typeof mock.files> => mock.files,
        diff: async ({ path }): Promise<(typeof mock.diffs)[string]> => {
          const diff = mock.diffs[path];
          if (!diff) throw new Error(`No diff mock for ${path}`);
          return diff;
        },
      },
    }),
  });

describe.each(Object.entries(changesMocks))(
  'the %s changes mock',
  (_, mock): void => {
    it('is served through session.changes and session.diff', async (): Promise<void> => {
      const caller = callerFor(mock);
      await expect(
        caller.session.changes({ sessionId: 'session-1' }),
      ).resolves.toEqual(mock.files);
      for (const file of mock.files)
        await expect(
          caller.session.diff({ sessionId: 'session-1', path: file.path }),
        ).resolves.toEqual(mock.diffs[file.path]);
    });

    it('counts each diff its own added and removed lines', (): void => {
      expect(mock.summary.files).toBe(mock.files.length);
      for (const file of mock.files) {
        const lines = mock.diffs[file.path]?.patch.text.split('\n') ?? [];
        const binary = lines.some((line): boolean =>
          line.startsWith('Binary files '),
        );
        const count = (sign: string, header: string): number =>
          lines.filter(
            (line): boolean =>
              line.startsWith(sign) && !line.startsWith(header),
          ).length;
        expect(mock.diffs[file.path]?.file).toEqual(file);
        expect(file.additions).toBe(binary ? null : count('+', '+++ '));
        expect(file.deletions).toBe(binary ? null : count('-', '--- '));
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
