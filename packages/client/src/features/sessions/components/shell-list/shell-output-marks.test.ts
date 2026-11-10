import { describe, expect, it } from 'vitest';
import type { ShellLine } from './shell-output-lines';
import { markedLine } from './shell-output-marks';

const marked = (text: string): ShellLine => markedLine([{ text }]);

describe('markedLine', () => {
  it.each([
    [
      'a URL',
      'open http://localhost:8081.',
      [
        { text: 'open ' },
        { text: 'http://localhost:8081', tone: 'info' },
        { text: '.' },
      ],
    ],
    [
      'an absolute path',
      'wrote /srv/app/verify.log, done',
      [
        { text: 'wrote ' },
        { text: '/srv/app/verify.log', tone: 'done' },
        { text: ', done' },
      ],
    ],
    [
      'a home path',
      'cd ~/argo/apps',
      [{ text: 'cd ' }, { text: '~/argo/apps', tone: 'done' }],
    ],
    [
      'a relative file path',
      'src/app/main.tsx:12:4 broke',
      [{ text: 'src/app/main.tsx:12:4', tone: 'done' }, { text: ' broke' }],
    ],
    [
      'an error word',
      'npm ERR! missing',
      [
        { text: 'npm ' },
        { text: 'ERR', tone: 'danger' },
        { text: '! missing' },
      ],
    ],
    [
      'a warning word',
      'warning: The current Node.js path',
      [
        { text: 'warning', tone: 'warning' },
        { text: ': The current Node.js path' },
      ],
    ],
    [
      'a pass mark',
      '✓ 12 tests passed',
      [
        { text: '✓', tone: 'success' },
        { text: ' 12 tests ' },
        { text: 'passed', tone: 'success' },
      ],
    ],
  ] as const)('tones %s', (_, line, spans) => {
    expect(marked(line)).toEqual(spans);
  });

  it('leaves a line the command coloured as it coloured it', () => {
    const coloured: ShellLine = [
      { text: 'ok', tone: 'success' },
      { text: ' error in /srv/x.log' },
    ];

    expect(markedLine(coloured)).toBe(coloured);
  });

  it.each([
    ['a count of none', '0 errors, 0 warnings'],
    ['a flag', 'vitest --fail-fast'],
    ['a file name', 'see error.ts'],
  ])('leaves %s plain', (_, line) => {
    expect(marked(line)).toEqual([{ text: line }]);
  });

  it('keeps words and fractions that only look like paths plain', () => {
    expect(marked('and/or 1/2 3/4.5 errors? no')).toEqual([
      { text: 'and/or 1/2 3/4.5 ' },
      { text: 'errors', tone: 'danger' },
      { text: '? no' },
    ]);
  });
});
