import { group, startOf, storyExports } from './story-file.mts';

export type Sources = ReadonlyMap<string, string>;

export type ArgsBlock = { owner: string; body: string };

export type Lookup = { file: string; source: string; sources: Sources };

const blockComment = /\/\*[\s\S]*?\*\//g;

const lineComment = /\/\/[^\n]*/g;

const singleQuoted = /'(?:\\.|[^'\\])*'/g;

const doubleQuoted = /"(?:\\.|[^"\\])*"/g;

const backQuoted = /`(?:\\.|[^`\\])*`/g;

const innermostGroup = /[{[(][^{}[\]()]*[}\])]/g;

/*
 * Every quantifier here is bounded and none spans a newline: an unbounded run of space before a
 * colon or a brace is what makes a key pattern backtrack across a whole file. The formatter leaves
 * a key, its colon and its opening brace together, so one optional space is all a match needs.
 */
const keyToken = /\b([A-Za-z_$][\w$]*)\??:/g;

const argsOpens = /\bargs: ?\{/g;

const callbackEntry = /\b[A-Za-z_$][\w$]*\??: {0,3}(?:fn|action|=>)/g;

const flattenRounds = 40;

/*
 * Comments and string bodies are emptied before any brace is counted, so a brace inside a quoted
 * label or a commented-out draft cannot move the gate's idea of where an object ends.
 */
export const bare = (source: string): string =>
  source
    .replace(blockComment, '\n')
    .replace(lineComment, '\n')
    .replace(singleQuoted, "''")
    .replace(doubleQuoted, '""')
    .replace(backQuoted, '``');

/*
 * Innermost groups are emptied round by round until none is left, so what remains is the top level
 * alone. Each group goes without a trace, which keeps `onPress(): void` readable as a key.
 */
const flattened = (body: string): string => {
  let text = body;

  for (let round = 0; round < flattenRounds; round += 1) {
    const next = text.replace(innermostGroup, '');

    if (next === text) return text;

    text = next;
  }

  return text;
};

const keysIn = (flat: string): string[] =>
  [...flat.matchAll(keyToken)].map((match): string => group(match, 1));

export const topLevelKeys = (body: string): string[] => keysIn(flattened(body));

/*
 * The keys that carry data. ADR-0040 decision 10 keeps a fixture plain data and leaves callback
 * spies in the story file, so an object made only of spies is already where the ADR wants it.
 */
export const dataKeys = (body: string): string[] =>
  keysIn(flattened(body).replace(callbackEntry, ''));

const blockStep = (char: string): number =>
  (char === '{' ? 1 : 0) - (char === '}' ? 1 : 0);

// The body between `opens`, which holds a `{`, and its matching `}`.
const blockFrom = (text: string, opens: number): string => {
  let depth = 0;

  for (let cursor = opens; cursor < text.length; cursor += 1) {
    depth += blockStep(text.charAt(cursor));

    if (depth === 0) return text.slice(opens + 1, cursor);
  }

  return text.slice(opens + 1);
};

export const blockAfter = (text: string, match: RegExpMatchArray): string =>
  blockFrom(text, startOf(match) + match[0].length - 1);

// The story an args block belongs to, or the meta, whose args reach every story in the file.
const ownerAt = (text: string, cursor: number): string =>
  storyExports(text).findLast(({ start }): boolean => start < cursor)?.name ??
  'meta';

export const argsBlocks = (text: string): ArgsBlock[] =>
  [...text.matchAll(argsOpens)].map((match): ArgsBlock => ({
    owner: ownerAt(text, startOf(match)),
    body: blockAfter(text, match),
  }));
