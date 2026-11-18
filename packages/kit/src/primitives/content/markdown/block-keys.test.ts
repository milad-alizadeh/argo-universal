import { describe, expect, it } from 'vitest';
import { lexMarkdown } from '#kit/lex-markdown';
import { keepBlockPrefix, keyedBlocks } from './block-keys';

const keysOf = (text: string): string[] =>
  keyedBlocks(lexMarkdown(text)).map(({ key }) => key);

// A streaming message grows one chunk at a time; a block that is still being written must stay the same block for React, or it is unmounted and drawn again every frame the reader scrolls.
describe('keyedBlocks while a message streams', () => {
  it.each([
    {
      name: 'a paragraph growing',
      before: 'First paragraph.\n\nSecond par',
      after: 'First paragraph.\n\nSecond paragraph, longer',
    },
    {
      name: 'a code fence growing',
      before: 'Intro.\n\n```ts\nconst a = 1;',
      after: 'Intro.\n\n```ts\nconst a = 1;\nconst b = 2;',
    },
    {
      name: 'a list growing',
      before: 'Steps:\n\n- one\n- tw',
      after: 'Steps:\n\n- one\n- two\n- three',
    },
  ])('keeps the key of $name', ({ before, after }) => {
    expect(keysOf(after)).toEqual(keysOf(before));
  });

  it('numbers blocks of the same kind apart', () => {
    const keys = keysOf('One.\n\nTwo.\n\nThree.');

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives a block of another kind its own key', () => {
    expect(keysOf('Text.\n\n```\ncode\n```')).toHaveLength(2);
    expect(new Set(keysOf('Text.\n\n```\ncode\n```')).size).toBe(2);
  });
});

describe('keeping completed Markdown blocks', () => {
  it('keeps the same paragraph through successive appends and redraws the tail', () => {
    const first = lexMarkdown('First.\n\nSecond');
    const second = keepBlockPrefix(first, lexMarkdown('First.\n\nSecond.'));

    const third = keepBlockPrefix(
      second,
      lexMarkdown('First.\n\nSecond.\n\nThird.'),
    );

    expect(third[0]).toBe(first[0]);
    expect(second[2]).not.toBe(first[2]);
    expect(third[4]?.raw).toBe('Third.');
  });

  it('allows a later definition to resolve an earlier link', () => {
    const first = lexMarkdown('[See][target]\n\nSecond.');
    const next = lexMarkdown('[See][target]\n\nSecond.\n\n[target]: /target');

    expect(keepBlockPrefix(first, next)).toBe(next);
    expect(next[0]).toMatchObject({
      tokens: [{ type: 'link', href: '/target' }],
    });
  });
});
