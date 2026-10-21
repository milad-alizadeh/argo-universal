import { describe, expect, it } from 'vitest';
import { wholeLineCut } from './whole-line-cut';

describe('wholeLineCut', () => {
  it.each([
    {
      name: 'cuts a long paragraph after its last whole line',
      leaves: [{ y: 0, height: 200, lineHeight: 20 }],
      limit: 80,
      cut: 80,
    },
    {
      name: 'cuts in the gap before a paragraph whose next line would not fit',
      leaves: [
        { y: 0, height: 40, lineHeight: 20 },
        { y: 52, height: 40, lineHeight: 20 },
      ],
      limit: 80,
      cut: 72,
    },
    {
      name: 'cuts above a code block that crosses the limit',
      leaves: [
        { y: 0, height: 40, lineHeight: 20 },
        { y: 50, height: 60 },
      ],
      limit: 80,
      cut: 40,
    },
    {
      name: 'keeps a list marker and its item on the same lines',
      leaves: [
        { y: 0, height: 20, lineHeight: 20 },
        { y: 30, height: 20, lineHeight: 20 },
        { y: 30, height: 60, lineHeight: 20 },
      ],
      limit: 80,
      cut: 70,
    },
    {
      name: 'keeps the limit when only a tall block starts the message',
      leaves: [{ y: 0, height: 300 }],
      limit: 80,
      cut: 80,
    },
  ])('$name', ({ leaves, limit, cut }) => {
    expect(wholeLineCut(leaves, limit)).toBe(cut);
  });
});
