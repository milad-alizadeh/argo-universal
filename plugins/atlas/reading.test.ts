import type { ProcessResult } from '@argo/plugin-kit';
import { describe, expect, it } from 'vitest';
import { readFiles, type Answer } from './reading';

function ran(
  stdout: string,
  exitCode: number | null = 0,
  flags: Partial<ProcessResult> = {},
): Answer {
  const data: ProcessResult = {
    exitCode,
    stdout,
    stderr: '',
    truncated: false,
    timedOut: false,
    ...flags,
  };

  return { data };
}

const waiting = { data: undefined };

describe('Reading a Project’s files', () => {
  it('waits until every answer is in', () => {
    expect(
      readFiles({ lines: ran('a\x001\n'), branches: waiting, touches: ran('') })
        .state,
    ).toBe('loading');
  });

  it('reads the answers once they are all in', () => {
    const reading = readFiles({
      lines: ran('a\x001\n'),
      branches: ran('', 1),
      touches: ran('a\0'),
    });

    expect(reading).toEqual({
      state: 'ready',
      answers: {
        lines: { stdout: 'a\x001\n', truncated: false, timedOut: false },
        branches: { stdout: '', truncated: false, timedOut: false },
        touches: { stdout: 'a\0', truncated: false, timedOut: false },
      },
    });
  });

  it('fails as not a repository when git exits with an error', () => {
    const reading = readFiles({
      lines: ran('', 128),
      branches: ran('', 128),
      touches: ran('', 128),
    });

    expect(reading).toEqual({ state: 'failed', failure: 'not-repository' });
  });

  it('fails as no answer when the Query itself fails', () => {
    const reading = readFiles({
      lines: { data: undefined, error: 'refused' },
      branches: waiting,
      touches: waiting,
    });

    expect(reading).toEqual({ state: 'failed', failure: 'no-answer' });
  });

  it('fails as no answer when git runs out of time', () => {
    const reading = readFiles({
      lines: ran('', null, { timedOut: true }),
      branches: waiting,
      touches: waiting,
    });

    expect(reading).toEqual({ state: 'failed', failure: 'no-answer' });
  });

  it('carries the history git printed before it ran out of time', () => {
    const reading = readFiles({
      lines: ran('a\x001\n'),
      branches: ran('', 1),
      touches: ran('a\0', null, { timedOut: true }),
    });

    expect(reading.state === 'ready' && reading.answers.touches).toEqual({
      stdout: 'a\0',
      truncated: false,
      timedOut: true,
    });
  });

  it('carries that git cut an answer short', () => {
    const reading = readFiles({
      lines: ran('a\x001\n', 0, { truncated: true }),
      branches: ran('', 1),
      touches: ran('a\0', 0, { truncated: true }),
    });

    expect(reading.state === 'ready' && reading.answers).toMatchObject({
      lines: { truncated: true },
      branches: { truncated: false },
      touches: { truncated: true },
    });
  });

  it('draws a Project with no commits yet as unchanged', () => {
    const reading = readFiles({
      lines: ran('a\x001\n'),
      branches: ran('', 1),
      touches: ran('', 128),
    });

    expect(reading.state === 'ready' && reading.answers.touches.stdout).toBe(
      '',
    );
  });
});
