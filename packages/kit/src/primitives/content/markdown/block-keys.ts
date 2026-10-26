import type { Token } from 'marked';
import { withOccurrenceKeys } from '#kit/occurrence-keys';

// A block's token with the key React holds it by.
export interface KeyedToken<T extends Token = Token> {
  token: T;
  key: string;
}

/*
 * A block is held by its kind and how many of that kind come before it, never by its text: a block
 * still being written has new text every frame, and a key made of it would unmount the block and draw
 * it again each time, a code fence's scroll views and the caret with it.
 */
export function keyedTokens<T extends Token>(
  tokens: readonly T[],
  keyOf: (token: T) => string,
): KeyedToken<T>[] {
  return withOccurrenceKeys(tokens, keyOf).map(({ item, key }) => ({
    token: item,
    key,
  }));
}

export const keyedBlocks = (tokens: readonly Token[]): KeyedToken[] =>
  keyedTokens(
    tokens.filter((token) => token.type !== 'space'),
    (token) => token.type,
  );
