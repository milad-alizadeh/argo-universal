import type { Token, TokenStream } from 'prismjs';
import { grammarFor, tokenize } from './grammars';
import { type SyntaxType, syntaxTypeFor } from './syntax-types';

export interface CodeSpan {
  text: string;
  type?: SyntaxType;
}

/*
 * Past this the block is already scrolling inside its own box and nobody reads the far end, while
 * the span count is what a virtualised Feed row has to lay out. Longer code draws plain.
 */
const maxHighlightedLength = 20_000;

// Neighbours of one colour join, so a run of plain code is one span rather than one per token.
function addSpan(spans: CodeSpan[], text: string, type?: SyntaxType): void {
  const last = spans.at(-1);

  if (last && last.type === type) last.text += text;
  else spans.push({ text, type });
}

/*
 * Prism nests tokens, so a leaf takes the nearest enclosing name that has a colour: a `punctuation`
 * inside a `string` stays string-coloured, and plain text between tokens keeps the foreground.
 */
function addStream(
  stream: TokenStream,
  inherited: SyntaxType | undefined,
  spans: CodeSpan[],
): void {
  if (typeof stream === 'string') return addSpan(spans, stream, inherited);

  if (Array.isArray(stream)) {
    for (const item of stream) addStream(item, inherited, spans);

    return;
  }

  addStream(stream.content, tokenType(stream, inherited), spans);
}

function tokenType(
  token: Token,
  inherited: SyntaxType | undefined,
): SyntaxType | undefined {
  return syntaxTypeFor(token) ?? inherited;
}

/*
 * The code split into coloured runs, or nothing when it draws plain: an unknown language, or a
 * block too long to be worth colouring. Synchronous, so a Feed row never reflows to pick colours up.
 */
export function codeSpans(
  code: string,
  language: string | undefined,
): CodeSpan[] | undefined {
  const grammar = grammarFor(language);

  if (grammar === undefined || code.length > maxHighlightedLength)
    return undefined;

  const spans: CodeSpan[] = [];

  addStream(tokenize(code, grammar), undefined, spans);

  return spans;
}
