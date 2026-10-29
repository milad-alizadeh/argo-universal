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
  /*
   * A heading takes a type role wherever it is drawn (Title for #, Heading below it),
   * which carries its weight, so this only has to bind it to the block under it.
   */
  proseHeading: 'pt-1',
  quote: 'border-l-2 border-border pl-3',
  listMarker: 'text-muted-foreground',
  domListMarker: 'marker:text-muted-foreground',
  codeBlock: 'rounded-2xl bg-tint',
  codeText: 'type-code text-foreground',
} as const;

/*
 * A link keeps the colour of the text around it and is marked only by its underline,
 * drawn in the focus colour: a DOM element takes that as a class, a React Native view
 * resolves the colour and sets textDecorationColor.
 */
export const markdownLinkClassNames = {
  underline: 'underline underline-offset-2',
  domUnderlineColor: 'decoration-focus',
  viewUnderlineColor: 'text-focus',
} as const;
