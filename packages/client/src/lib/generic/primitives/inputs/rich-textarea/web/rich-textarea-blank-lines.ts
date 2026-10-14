import type { Transformer } from '@lexical/markdown';

/*
 * Lexical drops empty paragraphs when it reads markdown, so blank lines typed with ⇧Return inside a
 * paragraph would come back as one. Each blank line between two lines of a paragraph is marked
 * instead: Lexical joins a marked line to the paragraph after a line break, and the import then
 * removes the mark and keeps the line break.
 */
type LineKind = 'blank' | 'paragraph' | 'other';

interface Reading {
  inFence: boolean;
  previous: LineKind;
}

function blockStarts(transformers: Transformer[]): RegExp[] {
  return transformers.flatMap((transformer) => {
    if (transformer.type === 'element') return [transformer.regExp];

    return transformer.type === 'multiline-element'
      ? [transformer.regExpStart]
      : [];
  });
}

const fenceMark = '```';

// A plain line continues the block before it, so it is a paragraph only after a blank line or another paragraph line.
const continuedKind = (previous: LineKind): LineKind =>
  previous === 'other' ? 'other' : 'paragraph';

function unfencedKind(
  line: string,
  reading: Reading,
  starts: RegExp[],
): LineKind {
  if (line.trim() === '') return 'blank';
  const startsBlock = starts.some((start) => start.test(line));

  return startsBlock ? 'other' : continuedKind(reading.previous);
}

// A line of three or more backticks, unless the same line also closes the code it opens.
function opensOrClosesFence(line: string): boolean {
  const trimmed = line.trim();

  const singleLine =
    trimmed.length >= fenceMark.length * 2 && trimmed.endsWith(fenceMark);

  return trimmed.startsWith(fenceMark) && !singleLine;
}

function readLine(line: string, reading: Reading, starts: RegExp[]): LineKind {
  const toggles = opensOrClosesFence(line);
  const fenced = reading.inFence || toggles;
  reading.inFence = reading.inFence !== toggles;

  return fenced ? 'other' : unfencedKind(line, reading, starts);
}

function lineKinds(lines: string[], starts: RegExp[]): LineKind[] {
  const reading: Reading = { inFence: false, previous: 'blank' };

  return lines.map((line) => {
    reading.previous = readLine(line, reading, starts);

    return reading.previous;
  });
}

// The kind of the nearest line that is not blank, looking from each line in one direction.
function nearestKinds(kinds: LineKind[]): LineKind[] {
  let nearest: LineKind = 'blank';

  return kinds.map((kind) => {
    if (kind !== 'blank') nearest = kind;

    return nearest;
  });
}

function insideParagraph(kinds: LineKind[]): boolean[] {
  const before = nearestKinds(kinds);
  const after = nearestKinds(kinds.toReversed()).toReversed();

  return kinds.map(
    (kind, index) =>
      kind === 'blank' &&
      before[index] === 'paragraph' &&
      after[index] === 'paragraph',
  );
}

export function markBlankLines(
  markdown: string,
  { mark, transformers }: { mark: string; transformers: Transformer[] },
): string {
  const lines = markdown.split('\n');
  const marked = insideParagraph(lineKinds(lines, blockStarts(transformers)));

  return lines.map((line, index) => (marked[index] ? mark : line)).join('\n');
}
