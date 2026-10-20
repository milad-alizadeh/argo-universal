/*
 * Prism's grammars are scripts that register themselves on one shared core, so the core import has
 * to come first and every grammar the app knows is listed here. Each one is a few hundred bytes;
 * a language with no grammar draws as plain code. Nothing outside this folder imports Prism.
 */
import Prism from 'prismjs/components/prism-core.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-rust.js';
import 'prismjs/components/prism-yaml.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-sql.js';

// Tags and file extensions Agents write that Prism has no alias of its own for.
const extraAliases: Record<string, string> = {
  cjs: 'javascript',
  cts: 'typescript',
  mjs: 'javascript',
  mts: 'typescript',
  rs: 'rust',
  zsh: 'bash',
};

/*
 * Prism registers these as empty grammars, so they would tokenise to one colourless run. Naming
 * them keeps the plain drawing, which is the same thing without the work.
 */
const plainLanguages = new Set(['plain', 'plaintext', 'text', 'txt']);

function namedGrammar(name: string): Prism.Grammar | undefined {
  if (plainLanguages.has(name)) return undefined;

  return Prism.languages[extraAliases[name] ?? name];
}

/*
 * A block names its language either as a tag or as the file the code came from, the same pair
 * `languageIcon` reads for the header icon. Casing never matters: `TS`, `ts` and `typescript`
 * all reach one grammar, and `Button.TSX` reaches the same one as `button.tsx`.
 */
export function grammarFor(
  language: string | undefined,
): Prism.Grammar | undefined {
  if (language === undefined) return undefined;

  const name = language.toLowerCase();

  return namedGrammar(name.includes('.') ? extensionOf(name) : name);
}

// `code-block-body.test.tsx` is TSX, so the grammar follows the last extension, not the first.
const extensionOf = (fileName: string): string =>
  fileName.slice(fileName.lastIndexOf('.') + 1);

export function tokenize(
  code: string,
  grammar: Prism.Grammar,
): (string | Prism.Token)[] {
  return Prism.tokenize(code, grammar);
}
