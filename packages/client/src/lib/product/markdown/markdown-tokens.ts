import type { MarkedToken, Token, Tokens } from 'marked';
import {
  type ComponentType,
  createElement,
  type FunctionComponent,
  type ReactElement,
} from 'react';

type TokenType = MarkedToken['type'];
export type TokenOf<T extends TokenType> = Extract<MarkedToken, { type: T }>;

export interface BlockTokenProps<T extends Token = Token> {
  token: T;
  caret: boolean;
}

function isToken<T extends TokenType>(
  token: Token,
  type: T,
): token is TokenOf<T> {
  return token.type === type;
}

/*
 * Files a renderer under its token type. The renderer takes that type's token,
 * so the lookup cannot hand it any other.
 */
export function byType<T extends TokenType, P extends { token: Token }>(
  type: T,
  Render: ComponentType<Omit<P, 'token'> & { token: TokenOf<T> }>,
): [T, FunctionComponent<P>] {
  const Narrowed = (props: P): ReactElement | null =>
    isToken(props.token, type)
      ? createElement(Render, { ...props, token: props.token })
      : null;
  Narrowed.displayName = Render.displayName ?? Render.name;
  return [type, Narrowed];
}

// Text marked would read as HTML or a link definition is drawn as it was written.
export function literal(token: Token): Tokens.Text {
  const text = token.raw.trimEnd();
  return { type: 'text', raw: text, text };
}
