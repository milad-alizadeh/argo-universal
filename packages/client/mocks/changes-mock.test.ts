import { changesMocks } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { toFileDiffs } from '../src/feed/file-diff';
import { createChangesMocks } from './changes-mock';

const isChangesMockName = (name: string): name is keyof typeof changesMocks =>
  Object.hasOwn(changesMocks, name);

describe.each(Object.entries(changesMocks))(
  'the %s changes mock',
  (name, mock) => {
    if (!isChangesMockName(name))
      throw new Error('Changes mock name is not registered');
    const fixtures = createChangesMocks(name);

    it('draws each file diff with the counts the file list shows', () => {
      const files = fixtures['session.changes']();
      expect(files).toHaveLength(mock.summary.files);
      const diffs = files.map((file) => {
        const { patch } = fixtures['session.diff']({
          sessionId: 'session-1',
          path: file.path,
        });
        const [diff] = toFileDiffs({
          type: 'diff',
          changes: [
            {
              operation: file.operation,
              path: file.path,
              oldPath: file.oldPath,
            },
          ],
          patch,
        });
        return { file, diff };
      });
      for (const { file, diff } of diffs) {
        expect(diff?.added).toBe(file.additions ?? 0);
        expect(diff?.removed).toBe(file.deletions ?? 0);
      }
      // A file without line counts is binary, so it draws no hunks.
      expect(
        diffs
          .filter(({ file }) => file.additions === null)
          .flatMap(({ diff }) => diff?.hunks ?? []),
      ).toEqual([]);
    });
  },
);
