import type { ReactNode } from 'react';
import { Icon } from '#primitives/content/icon';
import type {
  ComposerSuggestion,
  SuggestionGroup,
  SuggestionSource,
} from './rich-textarea-suggestions';

// One row of the suggestion menu, drawn the same on a phone and on the desktop.
export interface SuggestionRow {
  key: string;
  // Rows of one group sit together under its title.
  group: string;
  groupTitle: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  // What the row reads as: the result as typed, then its detail.
  label: string;
}

// With an icon the row names the command bare; the text a press inserts still starts with the slash.
const leadingSlash = /^\//;

const spoken = ({ label, detail }: ComposerSuggestion): string =>
  detail ? `${label} ${detail}` : label;

export function suggestionRow(
  source: SuggestionSource,
  suggestion: ComposerSuggestion,
): SuggestionRow {
  const { icon, label } = suggestion;

  return {
    key: `${source.id}-${suggestion.id}`,
    group: source.id,
    groupTitle: source.title,
    title: icon ? label.replace(leadingSlash, '') : label,
    subtitle: suggestion.detail,
    leading: icon ? <Icon name={icon} size="md" /> : undefined,
    label: spoken(suggestion),
  };
}

// Each source's results, under its title, in the order the sources are given.
export const groupRows = (
  groups: readonly SuggestionGroup[],
): SuggestionRow[] =>
  groups.flatMap(({ source, suggestions }) =>
    suggestions.map((suggestion) => suggestionRow(source, suggestion)),
  );
