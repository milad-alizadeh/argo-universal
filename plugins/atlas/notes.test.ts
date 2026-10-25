import { describe, expect, it } from 'vitest';
import { mapNotes, missingNotes } from './notes';
import {
  historyCommits,
  type Answered,
  type FileAnswers,
} from './project-files';

const whole: Answered = { stdout: '', truncated: false, timedOut: false };

const answers = (overrides: Partial<FileAnswers> = {}): FileAnswers => ({
  lines: whole,
  branches: whole,
  touches: whole,
  ...overrides,
});

describe('Notes on what the map lacks', () => {
  it('has none when git answered in full', () => {
    expect(missingNotes(answers())).toEqual([]);
  });

  it('says the history is partial when its output was cut', () => {
    const notes = missingNotes(
      answers({ touches: { ...whole, truncated: true } }),
    );

    expect(notes).toEqual([
      `History covers only part of the last ${historyCommits} commits.`,
    ]);
  });

  it('says the history is partial when git ran out of time', () => {
    const notes = missingNotes(
      answers({ touches: { ...whole, timedOut: true } }),
    );

    expect(notes).toHaveLength(1);
  });

  it('names each measure whose answer was cut', () => {
    const cut = { ...whole, truncated: true };

    expect(
      missingNotes(answers({ lines: cut, branches: cut, touches: cut })),
    ).toHaveLength(3);
  });
});

describe('Notes under the map', () => {
  it('says how many files a Project too big for one page left out', () => {
    const notes = mapNotes({ files: [], hidden: 5 }, answers());

    expect(notes).toContain('Showing the 0 largest of 5 files.');
  });

  it('adds what git left out after what the map shows', () => {
    const notes = mapNotes(
      { files: [], hidden: 0 },
      answers({ touches: { ...whole, truncated: true } }),
    );

    expect(notes.at(-1)).toMatch(/^History covers only part/u);
  });
});
