import { Listeners } from './rich-textarea-listeners';
import type {
  ComposerSuggestion,
  SuggestionAnswer,
  SuggestionGroup,
  SuggestionSource,
} from './rich-textarea-suggestions';

const resultLimit = 8;

type Slot = readonly ComposerSuggestion[] | 'pending';

const isPromise = (
  answer: SuggestionAnswer,
): answer is Promise<readonly ComposerSuggestion[]> => 'then' in answer;

const resultsOf = (slot: Slot | undefined): readonly ComposerSuggestion[] =>
  typeof slot === 'object' ? slot : [];

function groupOf(
  source: SuggestionSource,
  slot: Slot | undefined,
): SuggestionGroup[] {
  const suggestions = resultsOf(slot).slice(0, resultLimit);

  return suggestions.length > 0 ? [{ source, suggestions }] : [];
}

/*
 * One asking of every source for one query. A synchronous source's results are there at once; a
 * promise's join when it settles, and a listener hears of that. Groups keep source order, each
 * source shows at most 8 and a source with nothing is left out. A run is dropped when its query
 * changes: leave its listeners and a late answer is never heard. Listeners run when an answer
 * arrives, outside whatever the caller is doing, so a listener only asks for a new snapshot.
 */
export class SuggestionRun {
  private readonly slots: Slot[];
  private readonly listeners = new Listeners();
  private snapshot: SuggestionGroup[];

  constructor(
    private readonly sources: readonly SuggestionSource[],
    query: string,
  ) {
    this.slots = sources.map((source, index) => this.ask(source, query, index));
    this.snapshot = this.collect();
  }

  // The groups answered so far; the same array until another answer arrives.
  groups = (): SuggestionGroup[] => this.snapshot;

  // True while a source's promise has not settled.
  pending = (): boolean => this.slots.includes('pending');

  subscribe = this.listeners.add;

  private ask(source: SuggestionSource, query: string, index: number): Slot {
    const answer = source.query(query);

    if (!isPromise(answer)) return answer;
    answer.then(
      (results) => this.settle(index, results),
      () => this.settle(index, []),
    );

    return 'pending';
  }

  private settle(index: number, results: readonly ComposerSuggestion[]): void {
    this.slots[index] = results;
    this.snapshot = this.collect();
    this.listeners.notify();
  }

  private collect(): SuggestionGroup[] {
    return this.sources.flatMap((source, index) =>
      groupOf(source, this.slots[index]),
    );
  }
}
