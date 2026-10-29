import { expect, it } from 'vitest';
import { pagePatch } from './patch-page';

const preamble = [
  'diff --git a/notes.txt b/notes.txt',
  'index 1111111..2222222 100644',
  '--- a/notes.txt',
  '+++ b/notes.txt',
];

const patch = [
  ...preamble,
  '@@ -1,3 +1,3 @@ first',
  ' one',
  '-two',
  '+TWO',
  ' three',
  '@@ -10,2 +10,3 @@ second',
  ' ten',
  '+eleven',
  ' twelve',
  '\\ No newline at end of file',
  '',
].join('\n');

const page = (...lines: string[]): string =>
  `${[...preamble, ...lines].join('\n')}\n`;

it('returns whole hunks with their own headers while they fit', () => {
  expect(pagePatch(patch, 0, 10)).toEqual({
    patch: patch,
    nextCursor: null,
  });
});

it('numbers the start of a hunk cut by the page boundary', () => {
  expect(pagePatch(patch, 0, 2)).toEqual({
    patch: page('@@ -1,2 +1,1 @@ first', ' one', '-two'),
    nextCursor: 2,
  });
});

it('numbers the rest of a cut hunk from where the cut falls', () => {
  expect(pagePatch(patch, 2, 3)).toEqual({
    patch: page(
      '@@ -3,1 +2,2 @@ first',
      '+TWO',
      ' three',
      '@@ -10,1 +10,1 @@ second',
      ' ten',
    ),
    nextCursor: 5,
  });
});

it('keeps the missing-newline marker with the line it follows', () => {
  expect(pagePatch(patch, 5, 3)).toEqual({
    patch: page(
      '@@ -11,1 +11,2 @@ second',
      '+eleven',
      ' twelve',
      '\\ No newline at end of file',
    ),
    nextCursor: null,
  });
});

it('returns only the header lines of a patch without hunks', () => {
  const binary = `${[...preamble.slice(0, 2), 'Binary files differ'].join('\n')}\n`;

  expect(pagePatch(binary, 0, 10)).toEqual({ patch: binary, nextCursor: null });
});
