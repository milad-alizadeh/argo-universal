import { expect, it } from 'vitest';
import { VoiceMarkerStream } from './conversation-marker-stream';

/* A word of a long line. */
const word = ' x';

const writing = '[STATUS] Writing';

// What a reader shows once every chunk has arrived.

const shown = (chunks: string[]): string => {
  const stream = new VoiceMarkerStream();

  return chunks.map((chunk) => stream.push(chunk)).join('');
};

it('passes the chunks of a long line as they come', () => {
  const stream = new VoiceMarkerStream();

  expect(stream.push(writing)).toBe('Writing');
  expect(stream.push(word)).toBe(word);
  expect(stream.push(word)).toBe(word);
});

it('hides the mark of a line that follows a long line', () => {
  expect(
    shown([
      writing,
      ...Array.from({ length: 2000 }, () => word),
      ' done.\n[COMP',
      'LETE] Done.',
    ]),
  ).toBe(`Writing${word.repeat(2000)} done.\nDone.`);
});

it('shows the start of a line held back as a possible mark once it is text, after a no-break space', () => {
  expect(shown(['Writing', ' on\n\n\u00a0[', 'Done.'])).toBe(
    'Writing on\n\n\u00a0[Done.',
  );
});

it('gives out each character once after an opening mark and blank lines', () => {
  expect(shown(['[COMPLETE]', '\n\n ATU', '', 'S] '])).toBe('ATUS] ');
});

it('keeps analysis silent around a long line that passes as it comes', () => {
  expect(
    shown([
      writing,
      ' a',
      ' b\n[ANALY',
      'SIS] the plan',
      ' in detail\nstill thinking\n[COMPLETE] Do',
      'ne',
      ' now.',
    ]),
  ).toBe('Writing a b\nDone now.');
});

it('carries a result opened by a long line on to the lines after it', () => {
  expect(
    shown(['Working', ' on it\n[COMPLETE] All', ' set\n', 'Shipped.']),
  ).toBe('Working on it\nAll set\nShipped.');
});
