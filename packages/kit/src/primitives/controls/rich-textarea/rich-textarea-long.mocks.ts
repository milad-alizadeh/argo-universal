import { exampleLabel } from './rich-textarea-example.mocks';
import type { RichTextareaProps } from './rich-textarea-props';
import type { ComposerSuggestion } from './rich-textarea-suggestions';

// As many results as an Agent's Slash commands can run to, so the menu scrolls far past its window.
export const longSuggestionCount = 100;

/*
 * The rows the menu draws at once in its 350px box, with room to spare for whatever the List keeps beyond its
 * window; far fewer than the catalog, so drawing every result would fail an assertion made against it.
 */
export const drawnWindowLimit = 30;

// Every result of the catalog carries a detail and the text choosing it inserts, so a test can read either.
type RecordedSuggestion = ComposerSuggestion & {
  detail: string;
  insert: string;
};

export const longSuggestions: RecordedSuggestion[] = Array.from(
  { length: longSuggestionCount },
  (_, index) => ({
    id: `skill-${index + 1}`,
    label: `/skill-${index + 1}`,
    detail: `Skill ${index + 1}`,
    icon: 'code',
    insert: `/skill-${index + 1} `,
  }),
);

// What one row of the catalog reads as, and what choosing it inserts.
interface RecordedRow {
  name: string;
  insert: string;
}

// Read from the recorded result rather than from the menu's own wording.
export function longSuggestion(index: number): RecordedRow {
  const suggestion = longSuggestions[index];

  if (!suggestion)
    throw new Error(
      `Recorded catalog needs ${longSuggestionCount} results, each with a label, a detail and the text it inserts.`,
    );

  return {
    name: `${suggestion.label} ${suggestion.detail}`,
    insert: suggestion.insert,
  };
}

export const longSuggestionsRichTextarea = {
  value: '',
  accessibilityLabel: exampleLabel,
  suggestions: [
    {
      id: 'long',
      title: 'Suggestions',
      query: (): ComposerSuggestion[] => longSuggestions,
    },
  ],
} satisfies Omit<RichTextareaProps, 'onChangeText'>;
