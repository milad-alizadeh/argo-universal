import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Tokens } from './token-values.mts';

// The code's tokens as the light app sees them: Tailwind's defaults, then the theme, then light mode.
const BRACE: Record<string, number> = { '{': 1, '}': -1 };
const COMMENT = /\/\*[\s\S]*?\*\//g;

function braceStep(character: string | undefined): number {
  return BRACE[character ?? ''] ?? 0;
}

function closingBrace(css: string, open: number): number {
  let depth = 0;
  for (let at = open; at < css.length; at += 1) {
    depth += braceStep(css[at]);
    if (depth === 0) return at;
  }
  return css.length;
}

export function blockBody(css: string, opener: string): string {
  const start = css.indexOf(opener);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  return css.slice(open + 1, closingBrace(css, open));
}

// The statement a semicolon ends, without any rule or block that opens before it.
function statementOf(part: string): string {
  const after = Math.max(part.lastIndexOf('{'), part.lastIndexOf('}')) + 1;
  return part.slice(after).trim();
}

function declarationOf(statement: string): [string, string] {
  const colon = statement.indexOf(':');
  return [statement.slice(0, colon), statement.slice(colon + 1).trim()];
}

export function declarations(body: string): Tokens {
  return Object.fromEntries(
    body
      .replaceAll(COMMENT, '')
      .split(';')
      .map(statementOf)
      .filter((statement): boolean => statement.startsWith('--'))
      .map(declarationOf),
  );
}

export interface CodeTokens {
  // Everything the app resolves, Tailwind's defaults included.
  all: Tokens;
  // Only what the repository's theme declares.
  own: Tokens;
}

export function readCodeTokens(themePath: string): CodeTokens {
  const tailwind = readFileSync(
    fileURLToPath(import.meta.resolve('tailwindcss/theme.css')),
    'utf8',
  );
  const theme = readFileSync(themePath, 'utf8');
  const own = {
    ...declarations(blockBody(theme, '@theme static')),
    ...declarations(blockBody(theme, '@variant light')),
  };
  return {
    all: { ...declarations(blockBody(tailwind, '@theme default')), ...own },
    own,
  };
}
