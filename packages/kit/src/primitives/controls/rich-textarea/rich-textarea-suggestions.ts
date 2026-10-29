import type { IconName } from '@repo/contracts/kit-symbols';

export interface ComposerSuggestion {
  id: string;
  label: string;
  detail?: string;
  icon?: IconName;
  insert: string;
  // Set only when the result is a Slash command: its name, which `commands` of the source lists.
  command?: string;
  resource?: {
    type: 'resource_link';
    name: string;
    uri: string;
    title?: string;
    description?: string;
    mimeType?: string;
    size?: number;
  };
}

export interface SlashCommandEntry {
  name: string;
  // Shown after the token until an argument is typed.
  hint?: string;
}

export interface SuggestionSource {
  id: string;
  title: string;
  query: (query: string) => readonly ComposerSuggestion[];
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
 * What the `/` list offers for a query: each source's first matches, in source order, empty sources
 * left out. The web and native lists both ask here, once per change; promises and stale answers (#1326) land here.
 */
export function querySuggestions(
  sources: readonly SuggestionSource[],
  query: string,
): SuggestionGroup[] {
  return sources.flatMap((source) => {
    const suggestions = source.query(query).slice(0, resultLimit);

    return suggestions.length > 0 ? [{ source, suggestions }] : [];
  });
}

// What the list offers while the caret is in a `/` word: each source's matches, or null when none match.
export function suggestionsAtCaret(
  text: string,
  caret: number,
  sources: readonly SuggestionSource[],
): SuggestionGroup[] | null {
  const match = matchSuggestionTrigger(text.slice(0, caret));

  if (!match) return null;
  const groups = querySuggestions(sources, match.matchingString);

  return groups.length > 0 ? groups : null;
}

// The space a word needs before it: none at the start of the text or after whitespace.
export function separatorBefore(before: string): string {
  return /(?:^|\s)$/.test(before) ? '' : ' ';
}

// Puts a word where the selection is, replacing it, with a space before it unless the text before is empty or ends in whitespace.
export function insertWordAtCaret(
  text: string,
  selection: { start: number; end: number },
  word: string,
): InsertedText {
  const before = text.slice(0, selection.start);
  const inserted = separatorBefore(before) + word;

  return {
    text: before + inserted + text.slice(selection.end),
    caret: selection.start + inserted.length,
  };
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
