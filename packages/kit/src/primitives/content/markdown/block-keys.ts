import type { Token, TokensList } from 'marked';
import { withOccurrenceKeys } from '#kit/occurrence-keys';

// A block's token with the key React holds it by.
export interface KeyedToken<T extends Token = Token> {
  token: T;
  key: string;
}

/*
 * A block is held by its kind and how many of that kind come before it, never by its text: a block
 * still being written has new text every frame, and a key made of it would unmount the block and draw
 * it again each time, including a code fence’s scroll views.
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

const sameBlock = (left: Token, right: Token | undefined): boolean =>
  right !== undefined && left.type === right.type && left.raw === right.raw;

function sharedBlocks(previous: TokensList, next: TokensList): number {
  const changed = previous.findIndex(
    (token, index) => !sameBlock(token, next[index]),
  );

  return changed < 0 ? previous.length : changed;
}

// Appends keep the completed prefix. Reference definitions can resolve links in earlier blocks.
export function keepBlockPrefix(
  previous: TokensList,
  next: TokensList,
): TokensList {
  if ([previous, next].some((tokens) => Object.keys(tokens.links).length > 0))
    return next;

  const prefix = sharedBlocks(previous, next);

  if (!prefix) return next;

  return Object.assign([...previous.slice(0, prefix), ...next.slice(prefix)], {
    links: next.links,
  });
}
