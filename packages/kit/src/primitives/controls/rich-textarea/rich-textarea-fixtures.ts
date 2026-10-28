import { exampleLabel } from './rich-textarea-example.mocks';
import type { RichTextareaProps } from './rich-textarea-props';
import type { ComposerSuggestion } from './rich-textarea-suggestions';

type RichTextareaFixture = Omit<RichTextareaProps, 'onChangeText'>;

const accessibilityLabel = exampleLabel;

const longDraft = Array.from(
  { length: 14 },
  (_, index) => `Line ${index + 1} of a long draft`,
).join('\n');

export const emptyRichTextarea = {
  value: '',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const boldRichTextarea = {
  value: 'Keep the **phone** readable.',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const italicRichTextarea = {
  value: 'Keep the _phone_ readable.',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const strikethroughRichTextarea = {
  value: 'Keep the ~~tablet~~ phone readable.',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const inlineCodeRichTextarea = {
  value: 'Run `pnpm test` before you push.',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const linkRichTextarea = {
  value: 'Read the [the guide](https://example.com/guide) before you start.',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const threeLinesRichTextarea = {
  value: 'Match the spacing.\nKeep the phone readable.\nUse both themes.',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const headingsRichTextarea = {
  value: '# Title heading\n\n## Second heading\n\nBody text for comparison',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const nestedListsRichTextarea = {
  value:
    '- Plan the layout\n    - Draft the rows\n        - Outline\n- Ship\n\n1. Build\n    1. Test\n2. Release',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const quoteRichTextarea = {
  value: '> Keep the phone readable.\n> Use both themes.',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const codeBlockRichTextarea = {
  value: 'Run this first:\n\n```\npnpm install\npnpm test\n```',
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const longDraftRichTextarea = {
  value: longDraft,
  accessibilityLabel,
} satisfies RichTextareaFixture;

export const suggestionsRichTextarea = {
  value: '/',
  accessibilityLabel,
  autoFocus: true,
  suggestions: [
    {
      id: 'example',
      title: 'Suggestions',
      query: (query: string): ComposerSuggestion[] =>
        [
          {
            id: 'first',
            label: '/first',
            detail: 'First option',
            insert: '/first ',
          },
          {
            id: 'second',
            label: '/second',
            detail: 'Second option',
            insert: '/second ',
          },
        ].filter(({ label }) => label.slice(1).startsWith(query)),
    },
  ],
} satisfies RichTextareaFixture;
