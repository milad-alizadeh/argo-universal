import type { MarkdownProps } from './markdown-props';

export const headingsMarkdown = {
  text: '# Overview\n\nA short introduction.\n\n## Details\n\nMore information.\n\n### Notes',
} satisfies MarkdownProps;

export const listsMarkdown = {
  text: 'A paragraph.\n\n3. Third item\n4. Fourth item\n   - Nested item',
} satisfies MarkdownProps;

export const inlineMarkdown = {
  text: '**Bold**, *italic*, ~~removed~~, `value`, and [a page](https://example.com).',
} satisfies MarkdownProps;

export const quoteAndBreakMarkdown = {
  text: '> A quoted note.\n\n---\n\nThe next paragraph.',
} satisfies MarkdownProps;

export const codeMarkdown = {
  text: '```ts\nconst value = 42;\n```',
} satisfies MarkdownProps;

export const tableMarkdown = {
  text: '| Name | Value |\n| --- | --- |\n| Size | Small |',
} satisfies MarkdownProps;

export const streamingMarkdown = {
  text: 'Text arriving',
  streaming: true,
} satisfies MarkdownProps;
