import { expect, it } from 'vitest';
import { VoiceMarkerStream } from './voice-marker-stream';

// What a reader shows once every chunk has arrived.
const shown = (chunks: string[]): string => {
  const stream = new VoiceMarkerStream();

  return chunks.map((chunk) => stream.push(chunk)).join('');
};

it('passes the chunks of a long line as they come', () => {
  const stream = new VoiceMarkerStream();

  expect(stream.push('[STATUS] Writing')).toBe('Writing');
  expect(stream.push(' x')).toBe(' x');
  expect(stream.push(' x')).toBe(' x');
});

it('hides the mark of a line that follows a long line', () => {
  expect(
    shown([
      '[STATUS] Writing',
      ...Array.from({ length: 2000 }, () => ' x'),
      ' done.\n[COMP',
      'LETE] Done.',
    ]),
  ).toBe(`Writing${' x'.repeat(2000)} done.\nDone.`);
});

it('shows the start of a line held back as a possible mark once it is text, after a no-break space', () => {
  expect(shown(['Writing', ' on\n\n\u00a0[', 'Done.'])).toBe(
    'Writing on\n\n\u00a0[Done.',
  );
});

it('gives out each character once after an opening mark and blank lines', () => {
  expect(shown(['[COMPLETE]', '\n\n ATU', '', 'S] '])).toBe('ATUS] ');
});
