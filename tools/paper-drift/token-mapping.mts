import { resolveValue, type Tokens } from './token-values.mts';

// One code token as Paper can hold it: a Paper token type and a value, or why it cannot.
export type PaperTokenType =
  | 'breakpoint'
  | 'color'
  | 'container'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'letterSpacing'
  | 'lineHeight'
  | 'opacity'
  | 'radius'
  | 'spacing';

export interface TokenWrite {
  type: PaperTokenType;
  name: string;
  value: string | number;
}

export interface UnmappedToken {
  name: string;
  value: string;
  reason: string;
}

export type MappedToken = TokenWrite | UnmappedToken;

// Tailwind namespaces; `--font-weight-` before `--font-`, which it also starts with.
const NAMESPACES: [string, PaperTokenType][] = [
  ['--color-', 'color'],
  ['--spacing-', 'spacing'],
  ['--radius', 'radius'],
  ['--leading-', 'lineHeight'],
  ['--text-', 'fontSize'],
  ['--font-weight-', 'fontWeight'],
  ['--font-', 'fontFamily'],
  ['--tracking-', 'letterSpacing'],
  ['--breakpoint-', 'breakpoint'],
  ['--container-', 'container'],
  ['--opacity-', 'opacity'],
];

const NUMBER = String.raw`-?(?:\d+(?:\.\d+)?|\.\d+)`;
const PX = new RegExp(`^${NUMBER}px$`);
const PLAIN = new RegExp(`^${NUMBER}$`);
const TRACKING = new RegExp(`^${NUMBER}(?:em|px)$`);
const PERCENT = new RegExp(`^${NUMBER}%$`);
const HEX8 = /^#[\dA-F]{8}$/;
const WEIGHT = /^\d{3}$/;
const FUNCTION = /[()]/;
export const ALIAS = /^var\((--[\w-]+)\)$/;

function anyOf(...patterns: RegExp[]): (value: string) => boolean {
  return (value): boolean =>
    patterns.some((pattern): boolean => pattern.test(value));
}

// What Paper accepts for each type, checked on the resolved value.
const ACCEPTS: Record<PaperTokenType, (value: string) => boolean> = {
  breakpoint: anyOf(PX),
  color: anyOf(HEX8),
  container: anyOf(PX),
  fontFamily: (value): boolean => value !== '' && !FUNCTION.test(value),
  fontSize: anyOf(PX),
  fontWeight: anyOf(WEIGHT),
  letterSpacing: anyOf(TRACKING, PLAIN),
  lineHeight: anyOf(PX, PLAIN),
  opacity: anyOf(PLAIN, PERCENT),
  radius: anyOf(PX),
  spacing: anyOf(PX),
};

export function collapse(value: string): string {
  return value.trim().replaceAll(/\s+/g, ' ');
}

export function typeOfToken(name: string): PaperTokenType | undefined {
  return NAMESPACES.find(([prefix]): boolean => name.startsWith(prefix))?.[1];
}

interface Candidate {
  name: string;
  raw: string;
  type: PaperTokenType;
}

type Literal = (value: { raw: string; resolved: string }) => string | number;

// Colours keep their own spelling (oklch stays oklch) unless they lean on another token.
const LITERALS: Partial<Record<PaperTokenType, Literal>> = {
  fontWeight: ({ resolved }): number => Number(resolved),
  color: ({ raw, resolved }): string =>
    raw.includes('var(') ? resolved : collapse(raw),
};

function literalOf(candidate: Candidate, resolved: string): string | number {
  const literal = LITERALS[candidate.type];
  return literal ? literal({ raw: candidate.raw, resolved }) : resolved;
}

function unmapped(name: string, raw: string, reason: string): UnmappedToken {
  return { name, value: collapse(raw), reason };
}

// An alias stays an alias; anything else is resolved through the code's tokens.
function mapTyped(code: Tokens, candidate: Candidate): MappedToken {
  const { name, raw, type } = candidate;
  if (ALIAS.test(raw)) return { type, name, value: raw };
  const resolved = resolveValue(code, raw);
  if (!ACCEPTS[type](resolved))
    return unmapped(name, raw, `not a ${type} value Paper can hold`);
  return { type, name, value: literalOf(candidate, resolved) };
}

export function mapToken(code: Tokens, name: string): MappedToken {
  const raw = (code[name] ?? '').trim();
  const type = typeOfToken(name);
  if (type === undefined)
    return unmapped(name, raw, 'Paper has no token type for it');
  return mapTyped(code, { name, raw, type });
}

export function isWrite(token: MappedToken): token is TokenWrite {
  return 'type' in token;
}
