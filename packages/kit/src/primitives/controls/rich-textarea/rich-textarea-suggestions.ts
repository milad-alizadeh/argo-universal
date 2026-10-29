import type { IconName } from '@repo/contracts/kit-symbols';

export interface SuggestionResource {
  type: 'resource_link';
  name: string;
  uri: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
}

export interface ComposerSuggestion {
  id: string;
  label: string;
  detail?: string;
  icon?: IconName;
  insert: string;
  // Set only when the result is a Slash command: its name, which `commands` of the source lists.
  command?: string;
  // Sent with the prompt beside the text, as an Issue reference's `resource_link` is (ADR-0023).
  resource?: SuggestionResource;
}

export interface SlashCommandEntry {
  name: string;
  // Shown after the token until an argument is typed.
  hint?: string;
}

export type SuggestionAnswer =
  | readonly ComposerSuggestion[]
  | Promise<readonly ComposerSuggestion[]>;

export interface SuggestionSource {
  id: string;
  title: string;
  // A source may answer with a promise: it joins the list when it settles, and is ignored if the query has moved on.
  query: (query: string) => SuggestionAnswer;
  /*
   * The Slash commands this source has, stated apart from `query` so a typed `/name` is decided at once.
   * A result becomes a command token only through `command`, never by what it inserts.
   */
  commands?: readonly SlashCommandEntry[];
}

export function findCommand(
  sources: readonly SuggestionSource[],
  name: string,
): SlashCommandEntry | undefined {
  return sources
    .flatMap((source) => source.commands ?? [])
    .find((command) => command.name === name);
}

// The text before the caret ends in a `/` word at the start or after whitespace.
export function matchSuggestionTrigger(text: string): {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
} | null {
  const match = /(?:^|\s)(\/[^\s]*)$/.exec(text);

  if (!match?.[1]) return null;

  return {
    leadOffset: text.length - match[1].length,
    matchingString: match[1].slice(1),
    replaceableString: match[1],
  };
}

export interface SuggestionGroup {
  source: SuggestionSource;
  suggestions: readonly ComposerSuggestion[];
}

export interface InsertedText {
  text: string;
  caret: number;
}

const resultLimit = 8;

/*
 * One asking of every source for one query. A synchronous source's results are there at once; a
 * promise's join when it settles and `subscribe` hears of it. Groups keep source order, each source
 * shows at most 8 and a source with nothing is left out. A run is dropped when its query changes:
 * drop the subscription and a late answer is never heard.
 */
export interface SuggestionRun {
  groups: () => SuggestionGroup[];
  // True while a source's promise has not settled.
  pending: () => boolean;
  subscribe: (listener: () => void) => () => void;
}

type Slot = readonly ComposerSuggestion[] | 'pending';

const isPromise = (
  answer: SuggestionAnswer,
): answer is Promise<readonly ComposerSuggestion[]> => 'then' in answer;

function groupsOf(
  sources: readonly SuggestionSource[],
  slots: readonly Slot[],
): SuggestionGroup[] {
  return sources.flatMap((source, index) => {
    const slot = slots[index];
    const suggestions = slot === undefined || slot === 'pending' ? [] : slot;

    return suggestions.length > 0
      ? [{ source, suggestions: suggestions.slice(0, resultLimit) }]
      : [];
  });
}

export function startSuggestionQuery(
  sources: readonly SuggestionSource[],
  query: string,
): SuggestionRun {
  const listeners = new Set<() => void>();
  const slots: Slot[] = [];
  let snapshot: SuggestionGroup[] = [];

  const settle = (index: number, results: readonly ComposerSuggestion[]) => {
    slots[index] = results;
    snapshot = groupsOf(sources, slots);
    listeners.forEach((listener) => listener());
  };

  sources.forEach((source, index) => {
    const answer = source.query(query);

    if (isPromise(answer)) {
      slots[index] = 'pending';
      answer.then(
        (results) => settle(index, results),
        () => settle(index, []),
      );
    } else {
      slots[index] = answer;
    }
  });
  snapshot = groupsOf(sources, slots);

  return {
    groups: () => snapshot,
    pending: () => slots.includes('pending'),
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}

// The text typed after the `/` word the caret is in, or null when the caret is not in one.
export function slashQueryAtCaret(text: string, caret: number): string | null {
  return matchSuggestionTrigger(text.slice(0, caret))?.matchingString ?? null;
}

// Replaces the `/` word before the caret with the suggestion's text; the caret lands after it.
export function insertSuggestion(
  text: string,
  caret: number,
  suggestion: ComposerSuggestion,
): InsertedText {
  const start =
    matchSuggestionTrigger(text.slice(0, caret))?.leadOffset ?? caret;

  return {
    text: text.slice(0, start) + suggestion.insert + text.slice(caret),
    caret: start + suggestion.insert.length,
  };
}
