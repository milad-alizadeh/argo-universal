import type { Token, TokenStream } from 'prismjs';
import type { SyntaxRun, SyntaxType } from '../../../../code-text/syntax-run';
import { grammarFor, tokenize } from './grammars';
import { syntaxTypeFor } from './prism-token-types';

/*
 * Past this the block is already scrolling inside its own box and nobody reads the far end, while
 * the run count is what a virtualised Feed row has to lay out. Longer code draws plain.
 */
const maxHighlightedLength = 20_000;

// Neighbours of one colour join, so a stretch of plain code is one run rather than one per token.
function addRun(runs: SyntaxRun[], text: string, type?: SyntaxType): void {
  const last = runs.at(-1);

  if (last && last.type === type) last.text += text;
  else runs.push({ text, type });
}

const tokenType = (
  token: Token,
  inherited: SyntaxType | undefined,
): SyntaxType | undefined => syntaxTypeFor(token) ?? inherited;

/*
 * Prism nests tokens, so a leaf takes the nearest enclosing name that has a colour: a `punctuation`
 * inside a `string` stays string-coloured, and plain text between tokens keeps the foreground.
 */
function addStream(
  stream: TokenStream,
  inherited: SyntaxType | undefined,
  runs: SyntaxRun[],
): void {
  if (typeof stream === 'string') return addRun(runs, stream, inherited);

  if (Array.isArray(stream)) return addEach(stream, inherited, runs);

  addStream(stream.content, tokenType(stream, inherited), runs);
}

function addEach(
  stream: TokenStream[],
  inherited: SyntaxType | undefined,
  runs: SyntaxRun[],
): void {
  for (const item of stream) addStream(item, inherited, runs);
}

/*
 * The code split into coloured runs, or nothing when it draws plain: an unknown language, or a
 * block too long to be worth colouring. Synchronous, so a Feed row never reflows to pick colours up.
 */
export function syntaxRuns(
  code: string,
  language: string | undefined,
): SyntaxRun[] | undefined {
  const grammar = grammarFor(language);

  if (grammar === undefined || code.length > maxHighlightedLength)
    return undefined;

  const runs: SyntaxRun[] = [];

  addStream(tokenize(code, grammar), undefined, runs);

  return runs;
}
