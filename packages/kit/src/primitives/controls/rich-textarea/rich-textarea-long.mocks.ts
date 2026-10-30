import { exampleLabel } from './rich-textarea-example.mocks';
import type { RichTextareaProps } from './rich-textarea-props';
import type { ComposerSuggestion } from './rich-textarea-suggestions';

// As many results as an Agent's Slash commands can run to, so the menu scrolls far past its window.
export const longCommandCount = 100;

const longCommands: ComposerSuggestion[] = Array.from(
  { length: longCommandCount },
  (_, index) => ({
    id: `command-${index + 1}`,
    label: `/command-${index + 1}`,
    detail: `Command ${index + 1}`,
    icon: 'code',
    insert: `/command-${index + 1} `,
  }),
);

export const longSuggestionsRichTextarea = {
  value: '',
  accessibilityLabel: exampleLabel,
  suggestions: [
    { id: 'long', title: 'Suggestions', query: () => longCommands },
  ],
} satisfies Omit<RichTextareaProps, 'onChangeText'>;
