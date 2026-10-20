import type { ReactElement, ReactNode } from 'react';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#primitives/content/text';
import { type CodeSpan, codeSpans } from './code-spans';
import type { SyntaxType } from './syntax-types';

const syntaxClassNames: Record<SyntaxType, string> = {
  keyword: 'text-syntax-keyword',
  function: 'text-syntax-function',
  string: 'text-syntax-string',
  constant: 'text-syntax-constant',
  type: 'text-syntax-type',
  // The one place code is set in italic, as the Code master draws it.
  comment: 'text-syntax-comment italic',
};

function SyntaxSpan({ text, type }: CodeSpan): ReactElement {
  return (
    <Text role="code" className={type && syntaxClassNames[type]}>
      {text}
    </Text>
  );
}

/*
 * A fence's code as coloured runs, or the code itself where it draws plain. The runs are nested
 * Text, so the whole block stays one selectable, copyable piece of text.
 */
export function syntaxText(
  code: string,
  language: string | undefined,
): ReactNode {
  const spans = codeSpans(code, language);

  if (spans === undefined) return code;

  return withOccurrenceKeys(spans, (span) => span.text).map(({ item, key }) => (
    <SyntaxSpan key={key} {...item} />
  ));
}
