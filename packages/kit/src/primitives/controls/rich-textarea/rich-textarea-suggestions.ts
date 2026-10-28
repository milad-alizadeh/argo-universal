import type { IconName } from '@repo/contracts/kit-symbols';

export interface ComposerSuggestion {
  id: string;
  label: string;
  detail?: string;
  icon?: IconName;
  insert: string;
  hint?: string;
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

export interface SuggestionSource {
  id: string;
  title: string;
  query: (query: string) => readonly ComposerSuggestion[];
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
