import type { CodeTokens } from './theme-tokens.mts';
import { sameValue } from './token-drift.mts';
import {
  ALIAS,
  collapse,
  isWrite,
  mapToken,
  type TokenWrite,
  type UnmappedToken,
} from './token-mapping.mts';
import { resolveTokens, type Tokens } from './token-values.mts';

// What writing theme.css's tokens into Paper would add and change; Paper-only tokens stay.
export interface TokenChange extends TokenWrite {
  paper: string;
}

export interface TokenPlan {
  add: TokenWrite[];
  change: TokenChange[];
  unchanged: string[];
  paperOnly: string[];
  unmapped: UnmappedToken[];
}

interface Mapped {
  writes: TokenWrite[];
  unmapped: UnmappedToken[];
}

interface Sides {
  paper: Tokens;
  resolvedPaper: Tokens;
  resolvedCode: Tokens;
}

function aliasTarget(value: string | number | undefined): string | undefined {
  return ALIAS.exec(String(value ?? '').trim())?.[1];
}

// The token an alias names, when code declares it.
function declaredTarget(code: CodeTokens, name: string): string | undefined {
  const target = aliasTarget(code.all[name]);
  return target !== undefined && target in code.all ? target : undefined;
}

function addTarget(names: string[], code: CodeTokens, name: string): void {
  const target = declaredTarget(code, name);
  if (target !== undefined && !names.includes(target)) names.push(target);
}

// theme.css's own tokens, then the Tailwind defaults their aliases name.
export function codeTokenNames(code: CodeTokens): string[] {
  const names = Object.keys(code.own);
  for (const name of names) addTarget(names, code, name);
  return names;
}

function mapAll(code: CodeTokens, names: string[]): Mapped {
  const mapped = names.map((name) => mapToken(code.all, name));
  return {
    writes: mapped.filter(isWrite),
    unmapped: mapped.filter((token): token is UnmappedToken => !isWrite(token)),
  };
}

function dangles(available: Set<string>, write: TokenWrite): boolean {
  const target = aliasTarget(write.value);
  return target !== undefined && !available.has(target);
}

function danglingOf(write: TokenWrite): UnmappedToken {
  const target = aliasTarget(write.value) ?? '';
  const reason = `aliases ${target}, which Paper would not have`;
  return { name: write.name, value: String(write.value), reason };
}

// An alias whose target neither Paper holds nor this plan writes is unmapped too.
function settleAliases(paper: Tokens, found: Mapped): Mapped {
  const written = found.writes.map((write): string => write.name);
  const available = new Set([...Object.keys(paper), ...written]);
  const dangling = found.writes.filter((write) => dangles(available, write));
  return {
    writes: found.writes.filter((write) => !dangling.includes(write)),
    unmapped: [...found.unmapped, ...dangling.map(danglingOf)],
  };
}

function isAlias(write: TokenWrite): boolean {
  return ALIAS.test(String(write.value));
}

function sameSpelling(sides: Sides, write: TokenWrite): boolean {
  return collapse(sides.paper[write.name] ?? '') === String(write.value);
}

function sameResolved(sides: Sides, write: TokenWrite): boolean {
  if (isAlias(write)) return false;
  const paper = sides.resolvedPaper[write.name] ?? '';
  return sameValue(paper, sides.resolvedCode[write.name]);
}

// The same spelling, or the same resolved value unless code asks for an alias.
function isUnchanged(sides: Sides, write: TokenWrite): boolean {
  return sameSpelling(sides, write) || sameResolved(sides, write);
}

// Paper creates aliases after the tokens they name.
function addsOf(sides: Sides, writes: TokenWrite[]): TokenWrite[] {
  const added = writes.filter((write) => sides.paper[write.name] === undefined);
  return [...added.filter((w) => !isAlias(w)), ...added.filter(isAlias)];
}

function presentOf(sides: Sides, writes: TokenWrite[]): TokenWrite[] {
  return writes.filter((write) => sides.paper[write.name] !== undefined);
}

function changeOf(sides: Sides, write: TokenWrite): TokenChange {
  return { ...write, paper: sides.paper[write.name] ?? '' };
}

function sidesOf(paper: Tokens, code: CodeTokens): Sides {
  const resolvedCode = resolveTokens(code.all);
  return { paper, resolvedPaper: resolveTokens(paper), resolvedCode };
}

function paperOnlyOf(paper: Tokens, names: string[]): string[] {
  return Object.keys(paper)
    .filter((name): boolean => !names.includes(name))
    .toSorted((a, b): number => a.localeCompare(b));
}

export function planTokens(paper: Tokens, code: CodeTokens): TokenPlan {
  const names = codeTokenNames(code);
  const { writes, unmapped } = settleAliases(paper, mapAll(code, names));
  const sides = sidesOf(paper, code);
  const present = presentOf(sides, writes);
  const changed = present.filter((write) => !isUnchanged(sides, write));
  const kept = present.filter((write) => !changed.includes(write));
  return {
    add: addsOf(sides, writes),
    change: changed.map((write) => changeOf(sides, write)),
    unchanged: kept.map((write): string => write.name),
    paperOnly: paperOnlyOf(paper, names),
    unmapped,
  };
}
