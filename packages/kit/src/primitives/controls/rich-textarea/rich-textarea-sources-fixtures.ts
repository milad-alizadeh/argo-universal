import { exampleLabel } from './rich-textarea-example.mocks';
import type { RichTextareaProps } from './rich-textarea-props';
import type {
  ComposerSuggestion,
  SuggestionSource,
} from './rich-textarea-suggestions';

type RichTextareaFixture = Omit<RichTextareaProps, 'onChangeText'>;

const accessibilityLabel = exampleLabel;

const optionResults = (query: string): ComposerSuggestion[] =>
  [
    { id: 'first', label: '/first', detail: 'First option', insert: '/first ' },
    {
      id: 'second',
      label: '/second',
      detail: 'Second option',
      insert: '/second ',
    },
  ].filter(({ label }) => label.slice(1).startsWith(query));

// A result of a second source: it carries a `resource` to send with the prompt.
export const exampleItem: ComposerSuggestion = {
  id: 'item-7',
  label: 'Item 7',
  detail: 'Seventh item',
  insert: 'ITEM-7 ',
  resource: {
    type: 'resource_link',
    name: 'ITEM-7',
    uri: 'example://items/7',
    title: 'Seventh item',
  },
};

export const itemsSource: SuggestionSource = {
  id: 'items',
  title: 'Items',
  query: (query) =>
    'item'.startsWith(query.toLowerCase()) ? [exampleItem] : [],
};

export const optionsSource: SuggestionSource = {
  id: 'example',
  title: 'Suggestions',
  query: optionResults,
};

export const twoSourcesRichTextarea = {
  value: '',
  accessibilityLabel,
  suggestions: [optionsSource, itemsSource],
} satisfies RichTextareaFixture;
