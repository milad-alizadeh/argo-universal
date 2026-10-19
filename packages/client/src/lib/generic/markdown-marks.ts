// The inline marks markdown writes, wherever markdown is drawn: the Feed and the Composer's editor.
export const markdownMarks = [
  'bold',
  'italic',
  'strikethrough',
  'code',
] as const;

export type MarkdownMark = (typeof markdownMarks)[number];

// How each mark looks.
export const markdownMarkClassNames = {
  bold: 'font-semibold',
  italic: 'italic',
  strikethrough: 'line-through',
  code: 'rounded-sm bg-foreground/5 px-1.5 py-px type-code text-foreground',
} as const satisfies Record<MarkdownMark, string>;

/*
 * How markdown blocks look wherever markdown is drawn: a heading's weight, a quote's rule, a list's
 * markers, a code block's box. A DOM list colours its own ::marker.
 */
export const markdownBlockClassNames = {
  heading: 'font-semibold',
  // Rendered markdown's heading: Paper's 16/24 on every width, 4 below the block before it.
  proseHeading: 'font-semibold wide-type:text-base wide-type:leading-6 pt-1',
  quote: 'border-l-2 border-border pl-3',
  listMarker: 'text-muted-foreground',
  domListMarker: 'marker:text-muted-foreground',
  codeBlock: 'rounded-2xl bg-content',
  codeText: 'type-code text-foreground',
} as const;

// A link underlines in the ring colour: a DOM element takes it as a class, a React Native view resolves it.
export const markdownLinkClassNames = {
  underline: 'underline underline-offset-2',
  domColor: 'decoration-focus',
  viewColor: 'text-focus',
} as const;
