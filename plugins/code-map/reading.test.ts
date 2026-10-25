import type { ProcessResult } from '@argo/plugin-kit';
import { describe, expect, it } from 'vitest';
import { readFiles, type Answer } from './reading';

function ran(stdout: string, exitCode: number | null = 0): Answer {
  const data: ProcessResult = {
    exitCode,
    stdout,
    stderr: '',
    truncated: false,
    timedOut: false,
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
        lines: { stdout: 'a\x001\n', truncated: false },
        branches: { stdout: '', truncated: false },
        touches: { stdout: 'a\0', truncated: false },
      },
    });
  });

  it('fails when git cannot read the files', () => {
    const reading = readFiles({
      lines: ran('', 128),
      branches: ran('', 128),
      touches: ran('', 128),
    });

    expect(reading.state).toBe('failed');
  });

  it('fails when the Query itself fails', () => {
    const reading = readFiles({
      lines: { data: undefined, error: 'refused' },
      branches: waiting,
      touches: waiting,
    });

    expect(reading.state).toBe('failed');
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
