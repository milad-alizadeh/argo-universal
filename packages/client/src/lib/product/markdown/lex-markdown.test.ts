import type { TokensList } from 'marked';
import { describe, expect, it } from 'vitest';
import { createHeldLexer, type HeldLexerLimits } from './lex-markdown';

const limits: HeldLexerLimits = { texts: 2, textLength: 8 };

// What a text lexes to does not matter here, only whether it was lexed again.
const noTokens: TokensList = Object.assign([], { links: {} });

interface CountingLexer {
  lex: (text: string) => TokensList;
  // The texts that reached the lexer, so a held text is one this never saw twice.
  seen: string[];
}

function countingLexer(): CountingLexer {
  const seen: string[] = [];

  return {
    lex: (text): TokensList => {
      seen.push(text);

      return noTokens;
    },
    seen,
  };
}

describe('createHeldLexer', () => {
  it('lexes a text once', () => {
    const { lex, seen } = countingLexer();
    const lexMarkdown = createHeldLexer(limits, lex);

    lexMarkdown('a');
    lexMarkdown('a');

    expect(seen).toEqual(['a']);
  });

  it('drops the text lexed longest ago past the limit', () => {
    const { lex, seen } = countingLexer();
    const lexMarkdown = createHeldLexer(limits, lex);

    for (const text of ['a', 'b', 'c', 'a']) lexMarkdown(text);

    expect(seen).toEqual(['a', 'b', 'c', 'a']);
  });

  it('keeps a text that is read again', () => {
    const { lex, seen } = countingLexer();
    const lexMarkdown = createHeldLexer(limits, lex);

    for (const text of ['a', 'b', 'a', 'c', 'a']) lexMarkdown(text);

    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('never holds a text past the length limit', () => {
    const { lex, seen } = countingLexer();
    const lexMarkdown = createHeldLexer(limits, lex);
    const long = 'x'.repeat(limits.textLength + 1);

    lexMarkdown(long);
    lexMarkdown(long);

    expect(seen).toEqual([long, long]);
  });

  it('holds its texts apart from another lexer', () => {
    const first = countingLexer();
    const second = countingLexer();

    createHeldLexer(limits, first.lex)('a');
    createHeldLexer(limits, second.lex)('a');

    expect(second.seen).toEqual(['a']);
  });
});
