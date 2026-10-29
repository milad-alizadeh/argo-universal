import { expect, it, vi } from 'vitest';
import { trackedFiles, untrackedFile } from './parse';

const unknownStatus = 'Unrecognised git status response';

const reportedLines = (log: { mock: { calls: unknown[][] } }): string[] =>
  log.mock.calls.map(([line]): string => String(line));

const reportedCount = (line: string | undefined): number =>
  Number(/#(\d+)$/.exec(line ?? '')?.[1]);

it.each([
  ['A', 'add'],
  ['D', 'delete'],
  ['M', 'modify'],
  ['T', 'modify'],
  ['U', 'modify'],
] as const)('maps status %s to %s', (code, operation): void => {
  expect(trackedFiles(`${code}\0a.ts\0`, '3\t1\ta.ts\0')).toEqual([
    { operation, path: 'a.ts', additions: 3, deletions: 1 },
  ]);
});

it.each([
  ['C100', 'add'],
  ['R087', 'move'],
] as const)(
  'maps status %s to %s with the old path',
  (code, operation): void => {
    expect(
      trackedFiles(`${code}\0old.ts\0new.ts\0`, '2\t0\t\0old.ts\0new.ts\0'),
    ).toEqual([
      {
        operation,
        path: 'new.ts',
        oldPath: 'old.ts',
        additions: 2,
        deletions: 0,
      },
    ]);
  },
);

it('reads binary files as having no line counts', (): void => {
  expect(trackedFiles('M\0logo.png\0', '-\t-\tlogo.png\0')).toEqual([
    {
      operation: 'modify',
      path: 'logo.png',
      additions: null,
      deletions: null,
    },
  ]);
});

it.each([
  ['garbage', 'garbage\0'],
  ['non-numeric counts', 'x\ty\ta.ts\0'],
  ['a rename without paths', '1\t2\t\0'],
])('rejects, reports and counts a numstat with %s', (_name, numstat): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});

  expect(() => trackedFiles('M\0a.ts\0', numstat)).toThrow(
    /^Unrecognised git numstat( path)? response$/,
  );
  expect(reportedLines(log)).toEqual([
    expect.stringMatching(/^git: rejected numstat( path)? response #\d+$/),
  ]);
});

it.each(['X', 'B', 'Z', ''])(
  'rejects, reports and counts the unknown status code %j instead of calling it a modify',
  (code): void => {
    using log = vi.spyOn(console, 'error').mockImplementation((): void => {});

    expect(() => trackedFiles(`${code}\0a.ts\0`, '1\t1\ta.ts\0')).toThrow(
      unknownStatus,
    );
    expect(log).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^git: rejected status response #\d+$/),
      code,
    );
  },
);

it('rejects, reports and counts a name-status entry without a path', (): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});

  expect(() => trackedFiles('M\0', '')).toThrow(
    'Unrecognised git name-status response',
  );
  expect(reportedLines(log)).toEqual([
    expect.stringMatching(/^git: rejected name-status response #\d+$/),
  ]);
});

it('rejects, reports and counts a rename without its new path', (): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});

  expect(() => trackedFiles('R100\0old.ts\0', '')).toThrow(
    'Unrecognised git rename response',
  );
  expect(reportedLines(log)).toEqual([
    expect.stringMatching(/^git: rejected rename response #\d+$/),
  ]);
});

it('rejects, reports and counts an unrecognised untracked numstat', (): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});

  expect(() => untrackedFile('a.ts', 'garbage')).toThrow(
    'Unrecognised git untracked numstat response',
  );
  expect(reportedLines(log)).toEqual([
    expect.stringMatching(/^git: rejected untracked numstat response #\d+$/),
  ]);
});

it('counts each rejection one higher than the last', (): void => {
  using log = vi.spyOn(console, 'error').mockImplementation((): void => {});

  expect(() => trackedFiles('X\0a.ts\0', '')).toThrow(unknownStatus);
  expect(() => trackedFiles('X\0a.ts\0', '')).toThrow(unknownStatus);
  const [first, second] = reportedLines(log);

  expect(reportedCount(second)).toBe(reportedCount(first) + 1);
});
