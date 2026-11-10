import { describe, expect, it } from 'vitest';
import { shellOutputLines } from './shell-output-read';

const escape = '\u001B';

describe('shellOutputLines on lines the command left uncoloured', () => {
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
    expect(shellOutputLines(line)).toEqual([spans]);
  });

  it('leaves a line the command coloured as it coloured it', () => {
    expect(
      shellOutputLines(`${escape}[32mok${escape}[0m error in /srv/x.log`),
    ).toEqual([
      [{ text: 'ok', tone: 'success' }, { text: ' error in /srv/x.log' }],
    ]);
  });

  it('keeps words and fractions that only look like paths plain', () => {
    expect(shellOutputLines('and/or 1/2 3/4.5 errors? no')).toEqual([
      [
        { text: 'and/or 1/2 3/4.5 ' },
        { text: 'errors', tone: 'danger' },
        { text: '? no' },
      ],
    ]);
  });
});
