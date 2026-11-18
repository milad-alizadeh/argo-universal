import { describe, expect, it } from 'vitest';
import { lexMarkdown } from '#kit/lex-markdown';
import { streamingText } from './streaming-text';

describe('incomplete streaming Markdown', () => {
  it.each(['*', '**', '-', '1.', '#'])(
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
});
