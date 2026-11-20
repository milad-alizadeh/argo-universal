// How an Operation search reads words: an Agent's query and an Operation's id, label, keywords and description.

// Words an Agent puts around what it wants, which say nothing of which Operation it means.
const fillerWords = new Set(
  'a an and another any argo can for from i in into is it me my of on please the this to with'.split(
    ' ',
  ),
);

/*
 * Words Agents and Voice calls use for the same act. A query word also finds the others in its group, so
 * "start a new session" and "create a session" both reach `session.new`. Operations keep their own keywords;
 * this is only what any Operation's words may be called.
 */
const sameActs: readonly (readonly string[])[] = [
  ['new', 'start', 'create', 'launch', 'spawn', 'begin'],
  ['cancel', 'stop', 'interrupt', 'abort', 'halt', 'kill'],
  ['prompt', 'message', 'send', 'tell', 'ask'],
  ['rename', 'title', 'name'],
  ['remove', 'delete', 'uninstall'],
  ['restore', 'undo', 'unarchive'],
  ['show', 'read', 'get', 'view'],
  ['restart', 'reload', 'refresh'],
  ['set', 'change', 'switch', 'update', 'choose', 'pick'],
  ['check', 'validate', 'lint', 'verify'],
  ['repository', 'repo'],
  ['folder', 'directory'],
  ['microphone', 'mic'],
  ['done', 'complete', 'completed', 'finish', 'finished'],
  ['status', 'progress', 'state'],
  ['plugin', 'extension', 'extensions'],
];

// MiniSearch's own word boundary: spaces and punctuation.
const wordBoundary = /[\n\r\p{Z}\p{P}]+/u;

export const tokenize = (text: string): string[] =>
  text.split(wordBoundary).filter((word) => word !== '');

// An Operation id's words: `session.setTodoStep` reads as "session set todo step".
export const idWords = (id: string): string =>
  id.replaceAll('.', ' ').replaceAll(/([a-z])([A-Z])/g, '$1 $2');

// A plural of four letters or more reads as its singular, so "List Sessions" answers "session"; "process" stays.
export const singular = (word: string): string =>
  word.replace(/^(.{2,}[^s])s$/u, '$1');

// A word as the index holds it, or null for a filler word.
export const indexedTerm = (term: string): string | null => {
  const word = term.toLowerCase();

  return fillerWords.has(word) ? null : singular(word);
};

// Each word of a group, as the index reads it, to the whole group.
const alsoMeant = new Map(
  sameActs.flatMap((group) => {
    const read = group.map((word) => singular(word));

    return read.map((word) => [word, read] as const);
  }),
);

// What one query word searches for: itself, or every word of its group.
export const sameActTerms = (word: string): readonly string[] =>
  alsoMeant.get(word) ?? [word];

export const queriedTerms = (term: string): string[] | null => {
  const word = indexedTerm(term);

  return word === null ? null : [...sameActTerms(word)];
};

// Each term a query searches for, to the word the Agent typed that it stands for.
export const coverage = (
  words: readonly string[],
): ReadonlyMap<string, string> =>
  new Map(
    words
      .toReversed()
      .flatMap((word) =>
        sameActTerms(word).map((term) => [term, word] as const),
      ),
  );
