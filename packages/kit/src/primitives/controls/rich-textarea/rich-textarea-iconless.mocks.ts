import { exampleLabel } from './rich-textarea-example.mocks';
import type { RichTextareaProps } from './rich-textarea-props';
import type { ComposerSuggestion } from './rich-textarea-suggestions';

// A command with no icon, so its row keeps the slash in its label.
export const iconlessSuggestionsRichTextarea = {
  value: '',
  accessibilityLabel: exampleLabel,
  suggestions: [
    {
      id: 'iconless',
      title: 'Suggestions',
      query: (): ComposerSuggestion[] => [
        {
          id: 'plain',
          label: '/plain',
          detail: 'Plain option',
          insert: '/plain ',
        },
      ],
    },
  ],
} satisfies Omit<RichTextareaProps, 'onChangeText'>;
