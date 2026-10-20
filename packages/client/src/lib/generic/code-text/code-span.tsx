import type { ReactElement, ReactNode } from 'react';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#primitives/content/text';

/*
 * The colours the Foundations "Components / Code" master draws, one --color-syntax-* token each.
 * Everything else in a fence, punctuation and operators included, stays foreground.
 */
export const syntaxTypes = [
  'keyword',
  'function',
  'string',
  'constant',
  'type',
  'comment',
] as const;

export type SyntaxType = (typeof syntaxTypes)[number];

// A run of code of one colour, or of none where the code draws in the foreground.
export interface CodeSpan {
  text: string;
  type?: SyntaxType;
}

const syntaxClassNames = {
  keyword: 'text-syntax-keyword',
  function: 'text-syntax-function',
  string: 'text-syntax-string',
  constant: 'text-syntax-constant',
  type: 'text-syntax-type',
  // The one place code is set in italic, as the Code master draws it.
  comment: 'text-syntax-comment italic',
} as const satisfies Record<SyntaxType, string>;

function SyntaxSpan({ text, type }: CodeSpan): ReactElement {
  return (
    <Text role="code" className={type && syntaxClassNames[type]}>
      {text}
    </Text>
  );
}

/*
 * Coloured runs as nested Text, so the block around them stays one selectable, copyable piece of
 * text rather than a row of separate ones.
 */
export function codeSpanText(spans: CodeSpan[]): ReactNode {
  return withOccurrenceKeys(spans, (span) => span.text).map(({ item, key }) => (
    <SyntaxSpan key={key} {...item} />
  ));
}
