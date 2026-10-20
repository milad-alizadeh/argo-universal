import type { ReactElement, ReactNode } from 'react';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#primitives/content/text';

/*
 * The six the Foundations "Components / Code" master draws, one --color-syntax-* token each.
 * Everything else in a fence, punctuation and operators included, stays foreground.
 */
const syntaxTypes = [
  'keyword',
  'function',
  'string',
  'constant',
  'type',
  'comment',
] as const;

export type SyntaxType = (typeof syntaxTypes)[number];

// A run of code drawn in one colour, or in the foreground where it has no colour of its own.
export interface SyntaxRun {
  text: string;
  type?: SyntaxType;
}

/*
 * How each type draws. Uniwind reads these class names out of the source, so they stay written out
 * rather than built from the type. Comments are the one place code is set in italic, as the master
 * draws them.
 */
const syntaxClassNames = {
  keyword: 'text-syntax-keyword',
  function: 'text-syntax-function',
  string: 'text-syntax-string',
  constant: 'text-syntax-constant',
  type: 'text-syntax-type',
  comment: 'text-syntax-comment italic',
} as const satisfies Record<SyntaxType, string>;

function SyntaxText({ text, type }: SyntaxRun): ReactElement {
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
export function syntaxRunsText(runs: SyntaxRun[]): ReactNode {
  return withOccurrenceKeys(runs, (run) => run.text).map(({ item, key }) => (
    <SyntaxText key={key} {...item} />
  ));
}
