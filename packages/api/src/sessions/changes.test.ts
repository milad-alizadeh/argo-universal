import { SessionSnapshot } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  changesMocks,
  recordedFeedMocks,
  unreachableServices,
} from '../../mocks';
import { appRouter } from '../root';

const callerFor = (mock: (typeof changesMocks)[keyof typeof changesMocks]) =>
  appRouter.createCaller({
    services: unreachableServices({
      session: {
        changes: async () => mock.files,
        diff: async ({ path }) => {
          const diff = mock.diffs[path];
          if (!diff) throw new Error(`No diff mock for ${path}`);
          return diff;
        },
      },
    }),
  });

describe.each(Object.entries(changesMocks))(
  'the %s changes mock',
  (_, mock) => {
    it('is served through session.changes and session.diff', async () => {
      const caller = callerFor(mock);
      await expect(
        caller.session.changes({ sessionId: 'session-1' }),
      ).resolves.toEqual(mock.files);
      for (const file of mock.files)
        await expect(
          caller.session.diff({ sessionId: 'session-1', path: file.path }),
        ).resolves.toEqual(mock.diffs[file.path]);
    });

    it('counts each diff its own added and removed lines', () => {
      expect(mock.summary.files).toBe(mock.files.length);
      for (const file of mock.files) {
        const lines = mock.diffs[file.path]?.patch.text.split('\n') ?? [];
        const binary = lines.some((line) => line.startsWith('Binary files '));
        const count = (sign: string, header: string) =>
          lines.filter(
            (line) => line.startsWith(sign) && !line.startsWith(header),
          ).length;
        expect(mock.diffs[file.path]?.file).toEqual(file);
        expect(file.additions).toBe(binary ? null : count('+', '+++ '));
        expect(file.deletions).toBe(binary ? null : count('-', '--- '));
      }
    });
  },
);

it('covers no changes, a few files, many files, a large diff and a binary file', () => {
  const { none, fewFiles, manyFiles, largeDiff, binaryFile } = changesMocks;
  expect(none.files).toEqual([]);
  expect(none.summary).toEqual({ files: 0, additions: 0, deletions: 0 });
  expect(fewFiles.summary).toEqual({ files: 4, additions: 8, deletions: 5 });
  expect(fewFiles.files.map((file) => file.operation).sort()).toEqual([
    'add',
    'delete',
    'modify',
    'move',
  ]);
  expect(manyFiles.files.length).toBeGreaterThanOrEqual(50);
  expect(
    largeDiff.summary.additions + largeDiff.summary.deletions,
  ).toBeGreaterThanOrEqual(2000);
  expect(binaryFile.files).toContainEqual(
    expect.objectContaining({ additions: null, deletions: null }),
  );
});

it('gives every recorded Feed snapshot a changes summary', () => {
  for (const { snapshot } of recordedFeedMocks)
    expect(SessionSnapshot.shape.changes.parse(snapshot.changes)).toEqual(
      snapshot.changes,
    );
});
