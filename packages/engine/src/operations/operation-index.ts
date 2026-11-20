import type { OperationRow } from '@repo/contracts/operations';
import MiniSearch, { type SearchOptions, type SearchResult } from 'minisearch';
import {
  coverage,
  idWords,
  indexedTerm,
  queriedTerms,
  singular,
  tokenize,
} from './operation-words';

// What a search reads of an Operation, core or a Plugin's.
type Searchable = Pick<
  OperationRow,
  'id' | 'label' | 'keywords' | 'description'
>;

// Another word for the same act counts for less than the word the Agent typed.
const sameActWeight = 0.4;

// Fuzzy matching starts at five letters and forgives one typo in five, so "sesion" still finds Sessions.
const fuzzyFrom = 5;

const typoShare = 0.2;

const searchOptions: SearchOptions = {
  boost: { name: 3, label: 2, keywords: 2, description: 0.5 },
  combineWith: 'OR',
  prefix: (term) => term.length > 2,
  fuzzy: (term) => (term.length >= fuzzyFrom ? typoShare : false),
  processTerm: queriedTerms,
};

// When nothing matches, a second look forgives two typos in six letters, from four letters up.
const looseFuzzyFrom = 4;

const looseTypoShare = 0.35;

const looseOptions: SearchOptions = {
  fuzzy: (term) => (term.length >= looseFuzzyFrom ? looseTypoShare : false),
};

// What each indexed field reads of an Operation; `name` is its id read as words.
const fieldText = {
  name: (row: Searchable): string => idWords(row.id),
  label: (row: Searchable): string => row.label,
  keywords: (row: Searchable): string => row.keywords.join(' '),
  description: (row: Searchable): string => row.description,
} satisfies Record<string, (row: Searchable) => string>;

const fieldValue = (row: Searchable, field: string): string =>
  Object.entries(fieldText).find(([name]) => name === field)?.[1](row) ?? '';

// MiniSearch reads the id through the same hook as the fields.
const readField = (row: Searchable, field: string): string =>
  field === 'id' ? row.id : fieldValue(row, field);

// A match scoring under this share of the best one is noise from a single common word.
const keptShare = 0.15;

// The best matches kept whatever they cover, so a vague query still offers a few.
const fewestKept = 3;

// The shortest word a run-together word may be split into, so "hangup" reads as "hang up" and not "h angup".
const shortestPart = 2;

// The query's words: ids read as words, filler dropped.
const queryWords = (
  query: string,
  parts: (word: string) => string[],
): string[] =>
  tokenize(idWords(query))
    .flatMap(parts)
    .flatMap((word) => indexedTerm(word) ?? []);

/*
 * Of what a search found, best first: the ones that match the most of the query's words and score near the best,
 * so "list sessions" does not bring every list, and at least the best few whatever they match.
 */
function keptResults(
  found: readonly SearchResult[],
  words: readonly string[],
): SearchResult[] {
  const covering = coverage(words);

  const covered = (result: SearchResult): number =>
    new Set(result.queryTerms.map((term) => covering.get(term))).size;

  const most = Math.max(0, ...found.map(covered));

  const floor = (found[0]?.score ?? 0) * keptShare;

  return found.filter(
    (result, rank) =>
      rank < fewestKept || (covered(result) === most && result.score >= floor),
  );
}

/*
 * Operations ranked by how well they answer a query in an Agent's own words: by their id, label, keywords and
 * description, with typos, prefixes, words run together and other words for the same act. An exact id comes
 * first. An empty query keeps every Operation in registry order. Only a query none of whose words is near any
 * Operation's finds nothing.
 */
export class OperationIndex<Row extends Searchable> {
  private readonly byId: ReadonlyMap<string, Row>;

  // Every word the index holds, so a query word that is two of them run together can be split.
  private readonly vocabulary: ReadonlySet<string>;

  private readonly search = new MiniSearch<Row>({
    fields: Object.keys(fieldText),
    extractField: readField,
    processTerm: indexedTerm,
    searchOptions,
  });

  public constructor(private readonly rows: readonly Row[]) {
    this.byId = new Map(rows.map((row) => [row.id, row]));
    this.vocabulary = new Set(
      rows.flatMap((row) =>
        Object.values(fieldText).flatMap((text) =>
          tokenize(text(row)).flatMap((word) => indexedTerm(word) ?? []),
        ),
      ),
    );
    this.search.addAll(rows);
  }

  public ranked(filter: string): Row[] {
    const query = filter.trim();

    return query === '' ? [...this.rows] : this.matching(query);
  }

  private matching(query: string): Row[] {
    const exact = this.rows.filter(
      ({ id }) => id.toLowerCase() === query.toLowerCase(),
    );

    return [
      ...exact,
      ...this.scored(query).filter((row) => !exact.includes(row)),
    ];
  }

  // Every Operation the query's words find, best first, looser when none does, less the far worse ones.
  private scored(query: string): Row[] {
    const words = queryWords(query, (word) => this.parts(word));

    return keptResults(this.found(words), words).flatMap(
      ({ id }) => this.byId.get(String(id)) ?? [],
    );
  }

  private found(words: readonly string[]): SearchResult[] {
    const typed = new Set(words);

    const boostTerm = (term: string): number =>
      typed.has(term) ? 1 : sameActWeight;

    const query = words.join(' ');

    const strict = this.search.search(query, { boostTerm });

    return strict.length > 0
      ? strict
      : this.search.search(query, { ...looseOptions, boostTerm });
  }

  // A word the index lacks but holds as two words run together, such as "todolist", read as those two.
  private parts(word: string): string[] {
    const read = indexedTerm(word) ?? '';

    return this.vocabulary.has(read) ? [word] : this.split(read, word);
  }

  private split(read: string, word: string): string[] {
    const cuts = Array.from(
      { length: Math.max(0, read.length - 2 * shortestPart + 1) },
      (_, index) => index + shortestPart,
    );

    const at = cuts.find((cut) =>
      [read.slice(0, cut), read.slice(cut)].every((part) =>
        this.vocabulary.has(singular(part)),
      ),
    );

    return at === undefined ? [word] : [read.slice(0, at), read.slice(at)];
  }
}
