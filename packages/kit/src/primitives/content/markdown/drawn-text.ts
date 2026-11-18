import type { Token } from 'marked';

// The kinds of token `InlineTokens` draws through the tokens inside them.
const drawnThroughInner = new Set(['strong', 'em', 'del', 'link', 'text']);

const tokensOf = (token: Token): Token[] | undefined =>
  'tokens' in token ? token.tokens : undefined;

function innerTokens(token: Token): Token[] | undefined {
  return drawnThroughInner.has(token.type) ? tokensOf(token) : undefined;
}

// The text a token carries itself, for one drawn as written.
export const writtenText = (token: Token): string =>
  'text' in token ? String(token.text) : '';

function tokenText(token: Token): string {
  if (token.type === 'br') return '\n';
  const inner = innerTokens(token);

  return inner ? drawnText(inner) : writtenText(token);
}

// The text a block's inline tokens put on screen, in order: what `InlineTokens` draws of them, without the marks.
export function drawnText(tokens: readonly Token[] | undefined): string {
  return (tokens ?? []).map(tokenText).join('');
}
