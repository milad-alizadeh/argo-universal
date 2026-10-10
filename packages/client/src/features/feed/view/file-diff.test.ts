import { changesMocks } from '@repo/mocks/app';
import { expect, it } from 'vitest';
import { toFileDiffs } from './file-diff';

it.each([
  {
    scenario: 'fewFiles',
    path: 'src/sessions/session-row.tsx',
    added: 2,
    removed: 1,
  },
  {
    scenario: 'fewFiles',
    path: 'src/sessions/changes-chip.tsx',
    added: 5,
    removed: 0,
  },
  {
    scenario: 'fewFiles',
    path: 'src/sessions/legacy-badge.tsx',
    added: 0,
    removed: 3,
  },
  { scenario: 'fewFiles', path: 'src/feed/file-diff.ts', added: 1, removed: 1 },
  {
    scenario: 'manyFiles',
    path: 'packages/feature-03/src/index.ts',
    added: 2,
    removed: 1,
  },
  {
    scenario: 'largeDiff',
    path: 'src/generated/schema.ts',
    added: 1200,
    removed: 1000,
  },
  { scenario: 'binaryFile', path: 'README.md', added: 1, removed: 1 },
  { scenario: 'binaryFile', path: 'assets/logo.png', added: 0, removed: 0 },
  { scenario: 'binaryFile', path: 'assets/splash.png', added: 0, removed: 0 },
] as const)(
  'projects the saved Git patch for $scenario/$path',
  ({ scenario, path, added, removed }) => {
    const response = changesMocks[scenario].diffs[path];
    if (!response) throw new Error(`Missing Git patch ${scenario}/${path}`);
    const { file, patch } = response;
    const [diff] = toFileDiffs({
      type: 'diff',
      changes: [{ operation: file.operation, path, oldPath: file.oldPath }],
      patch,
    });
    expect(diff).toMatchObject({ path, added, removed });
    expect(diff?.hunks).toHaveLength(path.endsWith('.png') ? 0 : 1);
  },
);
