/*
 * The bracket-balancing the story reader and the props gate share: it reads a source as text, so
 * a snippet that does not parse whole still has a top level. Only `story-file.mts` and
 * `story-gate-props.mts` import it.
 */

// An object an args entry holds, and how many of its top-level keys carry data.
export type ArgsObject = { key: string; dataKeys: number };

export type ArgsBlock = {
  owner: string;
  keys: string[];
  objects: ArgsObject[];
};

type Owner = { name: string; start: number };

const startOf = (match: RegExpMatchArray): number => match.index ?? 0;

const group = (match: RegExpMatchArray, index: number): string =>
  match[index] ?? '';

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

const objectArg = /\b([A-Za-z_$][\w$]*): ?\{/g;

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
const dataKeys = (body: string): string[] =>
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

/*
 * Only the outermost object of an args entry is read: a nested one moves with it when the entry
 * becomes an import, so naming them all would send an author after the same fix three times.
 */
const outermostObjects = (body: string): ArgsObject[] => {
  const found: ArgsObject[] = [];
  let consumed = 0;

  for (const match of body.matchAll(objectArg)) {
    if (startOf(match) < consumed) continue;

    const inner = blockAfter(body, match);

    found.push({ key: group(match, 1), dataKeys: dataKeys(inner).length });
    consumed = startOf(match) + match[0].length + inner.length;
  }

  return found;
};

// The story an args block belongs to, or the meta, whose args reach every story in the file.
const ownerAt = (owners: readonly Owner[], cursor: number): string =>
  owners.findLast(({ start }): boolean => start < cursor)?.name ?? 'meta';

const argsBlockAt = (
  text: string,
  match: RegExpMatchArray,
  owners: readonly Owner[],
): ArgsBlock => {
  const body = blockAfter(text, match);

  return {
    owner: ownerAt(owners, startOf(match)),
    keys: topLevelKeys(body),
    objects: outermostObjects(body),
  };
};

export const argsBlocks = (
  source: string,
  owners: readonly Owner[],
): ArgsBlock[] => {
  const text = bare(source);

  return [...text.matchAll(argsOpens)].map((match): ArgsBlock =>
    argsBlockAt(text, match, owners),
  );
};
