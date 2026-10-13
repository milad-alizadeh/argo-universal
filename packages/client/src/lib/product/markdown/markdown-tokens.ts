import type { MarkedToken, Token, Tokens } from 'marked';

export interface BlockTokenProps {
  token: Token;
  caret: boolean;
}

// A renderer is chosen by its token's type; this narrows the token to that type's fields.
export function isToken<T extends MarkedToken['type']>(
  token: Token,
  type: T,
): token is Extract<MarkedToken, { type: T }> {
  return token.type === type;
}

// Text marked would read as HTML or a link definition is drawn as it was written.
export function literal(token: Token): Tokens.Text {
  const text = token.raw.trimEnd();
  return { type: 'text', raw: text, text };
}
