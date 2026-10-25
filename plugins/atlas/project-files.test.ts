import { describe, expect, it } from 'vitest';
import { branchBand } from './measures';
import { projectFiles, type FileAnswers } from './project-files';

const app = 'src/app.ts';

const answer = (stdout: string, truncated = false): FileAnswers['lines'] => ({
  stdout,
  truncated,
  timedOut: false,
});

function answers(overrides: Partial<FileAnswers> = {}): FileAnswers {
  return {
    lines: answer(
      'src/app.ts\u000012\nsrc/server.ts\u00007\nREADME.md\u00003\n',
    ),
    branches: answer('src/app.ts\u00004\n'),
    touches: answer('src/app.ts\u0000README.md\u0000\u0000src/app.ts\u0000'),
    ...overrides,
  };
}

describe('Project files', () => {
  it('reads each text file with its lines, branching lines and recent changes', () => {
    expect(projectFiles(answers())).toEqual([
      { path: 'README.md', lines: 3, branches: 0, touches: 1 },
      { path: app, lines: 12, branches: 4, touches: 2 },
      { path: 'src/server.ts', lines: 7, branches: 0, touches: 0 },
    ]);
  });

  it('reads paths with colons and spaces as git prints them', () => {
    const files = projectFiles(
      answers({
        lines: answer('docs/a: b.md\u00005\n'),
        branches: answer(''),
        touches: answer('docs/a: b.md\u0000'),
      }),
    );

    expect(files).toEqual([
      { path: 'docs/a: b.md', lines: 5, branches: 0, touches: 1 },
    ]);
  });

  it('ignores a file the history names that is no longer a text file', () => {
    const files = projectFiles(
      answers({ touches: answer('gone.ts\u0000src/app.ts\u0000') }),
    );

    expect(files.map((file) => file.path)).not.toContain('gone.ts');
  });

  it('reads a path with a newline in it as one path', () => {
    const files = projectFiles(
      answers({
        lines: answer('notes/a\nb.md\u00005\nsrc/app.ts\u00001\n'),
        branches: answer(''),
        touches: answer('notes/a\nb.md\u0000'),
      }),
    );

    expect(files).toEqual([
      { path: 'notes/a\nb.md', lines: 5, branches: 0, touches: 1 },
      { path: app, lines: 1, branches: 0, touches: 0 },
    ]);
  });

  it('skips a record with a blank count and reads the ones after it', () => {
    const files = projectFiles(
      answers({
        lines: answer('broken.ts\u0000\nsrc/app.ts\u00004\n'),
        branches: answer(''),
        touches: answer(''),
      }),
    );

    expect(files.map((file) => file.path)).toEqual([app]);
  });

  it('drops the last record of output the Server cut short', () => {
    const files = projectFiles(
      answers({ lines: answer('src/app.ts\u000012\nsrc/ser', true) }),
    );

    expect(files.map((file) => file.path)).toEqual([app]);
  });

  it('drops a count the Server cut short', () => {
    const files = projectFiles(
      answers({
        lines: answer('src/app.ts\u000012\nsrc/server.ts\u00007', true),
      }),
    );

    expect(files.map((file) => file.path)).toEqual([app]);
  });

  it('keeps the last record when the Server cut the output exactly at its end', () => {
    const files = projectFiles(
      answers({
        lines: answer('src/app.ts\u000012\nsrc/server.ts\u00007\n', true),
      }),
    );

    expect(files.map((file) => file.path)).toEqual([app, 'src/server.ts']);
  });

  it('does not count a history entry the Server cut short', () => {
    const files = projectFiles(
      answers({ touches: answer('src/app.ts\u0000src/app', true) }),
    );

    expect(files.find((file) => file.path === app)?.touches).toBe(1);
  });

  it('counts every history entry when the Server cut the output exactly at a path', () => {
    const files = projectFiles(
      answers({ touches: answer('src/app.ts\u0000src/app.ts\u0000', true) }),
    );

    expect(files.find((file) => file.path === app)?.touches).toBe(2);
  });
});

describe('Branch bands', () => {
  it.each([
    [0, 'low'],
    [5, 'low'],
    [6, 'middle'],
    [14, 'middle'],
    [15, 'high'],
  ] as const)('puts %i branching lines in the %s band', (branches, band) => {
    expect(branchBand(branches)).toBe(band);
  });
});
