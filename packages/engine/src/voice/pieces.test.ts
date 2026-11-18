import { expect, it } from 'vitest';
import { inPieces } from './pieces';

it('keeps a short message whole', () => {
  expect(inPieces('All green')).toEqual(['All green']);
});

it('never cuts a character, even when each is several bytes', () => {
  const pieces = inPieces('é'.repeat(600));

  expect(pieces.length).toBeGreaterThan(1);
  expect(pieces.join('')).toBe('é'.repeat(600));

  for (const piece of pieces)
    expect(Buffer.byteLength(piece)).toBeLessThanOrEqual(500);
});

it('splits a long run with no spaces', () => {
  expect(inPieces('x'.repeat(1_200)).map((piece) => piece.length)).toEqual([
    500, 500, 200,
  ]);
});
