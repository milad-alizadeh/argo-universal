import { describe, expect, it } from 'vitest';
import { lexMarkdown } from '#kit/lex-markdown';
import { drawnText } from './drawn-text';
import { lexStreamingMarkdown, streamingText } from './streaming-text';

describe('incomplete streaming Markdown', () => {
  it.each([
    ['[guide](https://example.com)', 'guide', 'link'],
    ['[guide](https://example.com/a(b))', 'guide', 'link'],
    ['[a \\] guide](https://example.com)', 'a ] guide', 'link'],
    ['[Read `x]x` here](https://example.com)', 'Read x]x here', 'link'],
    ['[guide](https://example.com "a ) title")', 'guide', 'link'],
    ['`pnpm install`', 'pnpm install', 'codespan'],
    ['<https://example.com>', 'https://example.com', 'link'],
    ['~~old text~~', 'old text', 'del'],
  ])('holds partial syntax until %s is complete', (syntax, label, type) => {
    const prefix = 'See this: ';

    for (let length = 1; length < syntax.length; length++) {
      const block = lexStreamingMarkdown(prefix + syntax.slice(0, length)).at(
        -1,
      );

      expect(block).toMatchObject({ tokens: [{ type: 'text', text: prefix }] });
    }

    const completed = lexStreamingMarkdown(prefix + syntax).at(-1);

    expect(completed).toMatchObject({
      tokens: [{ type: 'text' }, { type }],
    });

    if (!completed || !('tokens' in completed)) throw new Error('Missing text');

    expect(drawnText(completed.tokens)).toBe(prefix + label);
  });

  it('keeps links and code already on screen while a new link streams', () => {
    const before = 'Read [the guide](https://example.com) and run `pnpm`. ';

    expect(lexStreamingMarkdown(before + '[another](https://ex')).toEqual(
      lexMarkdown(before),
    );
  });

  it('does not create a block for a held link on its own', () => {
    expect(lexStreamingMarkdown('[guide](https://ex')).toEqual(lexMarkdown(''));
  });

  it.each([
    'Show \\[literal syntax',
    'Earlier [same\n\n\\[same',
    'Earlier [same\n\n```text\n[same',
    'Use [guide](two words) and keep reading.',
    'Show `[literal syntax`',
    'Use [this label] as text.',
    'Say hello!',
    'Use [this label](https://ex\n\nNext paragraph.',
    '```text\n[inside a fence](https://ex',
    '> ```text\n> [inside a fence](https://ex',
    '[guide]: https://example.com\n\nRead [guide].',
  ])('preserves parsed or settled content in %s', (text) => {
    expect(lexStreamingMarkdown(text)).toEqual(lexMarkdown(text));
  });

  it.each(['- See ', '> See '])(
    'holds a link inside partial container %s',
    (prefix) => {
      expect(lexStreamingMarkdown(prefix + '[guide](https://ex')).toEqual(
        lexMarkdown(prefix),
      );
    },
  );

  it.each(['*', '**', '-', '1.', '#', ' *', '  *', '   *', '  #'])(
    'holds an ambiguous trailing marker %s',
    (marker) => {
      const tokens = lexMarkdown(streamingText(`Before.\n\n${marker}`));
      expect(
        tokens
          .filter((token) => token.type !== 'space')
          .map((token) => token.type),
      ).toEqual(['paragraph']);
    },
  );
  it.each([
    ['*', 'em'],
    ['**', 'strong'],
    ['_', 'em'],
  ])(
    'keeps %s emphasis in the same form while the line grows',
    (mark, style) => {
      for (const tail of [
        'A short',
        'A short answer ',
        `A short answer.${mark.slice(0, -1)}`,
      ]) {
        const block = lexMarkdown(
          streamingText(`Before.\n\n${mark}${tail}`),
        ).at(-1);

        expect(block).toMatchObject({ tokens: [{ type: style }] });
      }
    },
  );
  it('keeps completed lists and formatting', () => {
    const text = 'Before.\n\n* item\n\n*Hello*';
    expect(streamingText(text)).toBe(text);
  });
  it('keeps code content and closing fences', () => {
    for (const text of [
      '```txt\n*',
      '```txt\nvalue\n```',
      '1. Code:\n\n   ```txt\n   *',
    ])
      expect(streamingText(text)).toBe(text);
  });
  it('keeps a marker within prose', () => {
    expect(streamingText('Multiply by *')).toBe('Multiply by *');
  });

  it('holds the first pipe of a table delimiter until the next chunk', () => {
    const header = '| Row state | Redraws |\n';
    expect(streamingText(header + '|')).toBe(header);
    const table = header + '| --- | --- |';
    expect(lexMarkdown(streamingText(table)).at(-1)?.type).toBe('table');
    expect(streamingText(table + '\n|')).toBe(table + '\n|');
    expect(streamingText(header + '| literal text')).toBe(
      header + '| literal text',
    );
  });

  it('preserves a lone pipe after prose and inside code', () => {
    for (const text of [
      'A paragraph\n|',
      '```text\n| Row state | Redraws |\n|',
    ]) {
      expect(streamingText(text)).toBe(text);
    }
  });
});
