import { formatHex8, parse } from 'culori';

// Token values reduced to one spelling each, so Paper and code can be compared as strings.
export type Tokens = Record<string, string>;

const REM = 16;
const MAX_DEPTH = 8;
const NUMBER = String.raw`(-?(?:\d+(?:\.\d+)?|\.\d+))`;
const LENGTH = new RegExp(`^${NUMBER}(px|rem)$`);
const CALC = new RegExp(String.raw`^calc\(${NUMBER}px ([+-]) ${NUMBER}px\)$`);
const VAR = /var\((--[\w-]+)\)/g;
const NOT_COLOR = /^[\d.-]/;

function lengthOf(value: string): string | undefined {
  const match = LENGTH.exec(value);
  if (!match) return undefined;
  const scale = match[2] === 'rem' ? REM : 1;
  return `${Number(match[1]) * scale}px`;
}

function calcOf(value: string): string | undefined {
  const match = CALC.exec(value);
  if (!match) return undefined;
  const sign = match[2] === '-' ? -1 : 1;
  return `${Number(match[1]) + sign * Number(match[3])}px`;
}

function colorOf(value: string): string | undefined {
  if (NOT_COLOR.test(value)) return undefined;
  const color = parse(value);
  return color && formatHex8(color).toUpperCase();
}

const NORMALISERS = [lengthOf, calcOf, colorOf];

export function normaliseValue(value: string): string {
  const trimmed = value.trim().replaceAll(/\s+/g, ' ');
  const normalised = NORMALISERS.map((normalise): string | undefined =>
    normalise(trimmed),
  ).find((candidate): boolean => candidate !== undefined);
  return normalised ?? trimmed;
}

function substitute(tokens: Tokens, value: string, depth: number): string {
  if (depth > MAX_DEPTH || !value.includes('var(')) return value;
  const next = value.replaceAll(
    VAR,
    (whole, name: string): string => tokens[name] ?? whole,
  );
  return substitute(tokens, next, depth + 1);
}

export function resolveValue(tokens: Tokens, value: string): string {
  return normaliseValue(substitute(tokens, value, 0));
}

// Follows var() references through the same set, then normalises.
export function resolveTokens(tokens: Tokens): Tokens {
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]): [string, string] => [
      name,
      resolveValue(tokens, value),
    ]),
  );
}
