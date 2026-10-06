import { changesMocks } from '@repo/api/mocks';
import { describe, expect, it } from 'vitest';
import { toFileDiffs } from '../src/feed/file-diff';
import { createChangesMocks } from './changes-mock';

describe.each(Object.entries(changesMocks))('the %s changes mock', (name) => {
  const fixtures = createChangesMocks(name as keyof typeof changesMocks);

  it('draws each file diff with the counts the file list shows', () => {
    const files = fixtures['session.changes']();
    for (const file of files) {
      const { patch } = fixtures['session.diff']({
        sessionId: 'session-1',
        path: file.path,
      });
      const [diff] = toFileDiffs({
        type: 'diff',
        changes: [
          { operation: file.operation, path: file.path, oldPath: file.oldPath },
        ],
        patch,
      });
      expect(diff?.added).toBe(file.additions ?? 0);
      expect(diff?.removed).toBe(file.deletions ?? 0);
      if (file.additions === null) expect(diff?.hunks).toEqual([]);
    }
  });
});
