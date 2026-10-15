import { describe, expect, it } from 'vitest';
import { editEchoes } from './edit-echoes';

describe('values the form commits back to a native field', () => {
  it.each([
    {
      story: 'an earlier edit arriving after a newer one',
      edits: ['Native field chec', 'Native field check'],
      commits: ['Native field chec', 'Native field check'],
      echoes: [true, true],
    },
    {
      story: 'several edits batched into one commit',
      edits: ['a', 'ab', 'abc'],
      commits: ['abc'],
      echoes: [true],
    },
    {
      story: 'a reset from outside after typing',
      edits: ['draft'],
      commits: [''],
      echoes: [false],
    },
    {
      story: 'a value the form changed from what was typed',
      edits: ['acp '],
      commits: ['acp'],
      echoes: [false],
    },
    {
      story: 'an earlier value once a newer edit was committed',
      edits: ['a', 'ab'],
      commits: ['ab', 'a'],
      echoes: [true, false],
    },
  ])('tells $story apart', (row) => {
    const echoes = editEchoes();

    for (const edit of row.edits) echoes.edited(edit);
    expect(row.commits.map((value) => echoes.takeEcho(value))).toEqual(
      row.echoes,
    );
  });
});
