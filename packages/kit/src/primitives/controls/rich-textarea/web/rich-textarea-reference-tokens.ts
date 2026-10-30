import { $createTextNode, type TextNode } from 'lexical';
import type { ReferenceOption } from '../rich-textarea-references';
import { $createReferenceNode } from './rich-textarea-reference-node';
import type { TokenFinder, TypedToken } from './rich-textarea-typed-tokens';

// `#123` after a space or a bracket, and before a space or the end of the text.
const typedReference = /(?<![^\s(])#(\d+)(?=\s|$)/g;

function foundIn(text: string, known: ReadonlySet<number>): TypedToken[] {
  return [...text.matchAll(typedReference)].flatMap((match) => {
    const number = Number(match[1]);
    const end = match.index + match[0].length;

    return known.has(number)
      ? [
          {
            start: match.index,
            end,
            $create: () => $createReferenceNode(number),
          },
        ]
      : [];
  });
}

/*
 * A typed `#123` that names a known Issue or pull request becomes a token, so a draft loaded with
 * `#443` in it shows the token too. The number is left alone while it is being typed.
 */
export function referenceTokens(
  references: readonly ReferenceOption[],
): TokenFinder {
  const known = new Set(references.map(({ number }) => number));

  return (text) => foundIn(text, known);
}

// What choosing an option leaves: the token and a space after it, the caret past both.
export function $insertReference(
  node: TextNode | null,
  option: ReferenceOption,
): void {
  const space = $createTextNode(' ');
  const token = $createReferenceNode(option.number);
  node?.replace(token);
  token.insertAfter(space);
  space.selectEnd();
}
