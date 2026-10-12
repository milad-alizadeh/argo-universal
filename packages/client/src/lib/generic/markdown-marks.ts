// How inline markdown marks look wherever markdown is drawn: the Feed and the Composer's editor.
export const markdownMarkClassNames = {
  bold: 'font-semibold',
  italic: 'italic',
  strikethrough: 'line-through',
  code: 'rounded-sm bg-foreground/5 px-1.5 py-px type-code text-foreground',
} as const;

// How markdown blocks look wherever markdown is drawn: a quote's rule, a list's markers, a code block's box.
export const markdownBlockClassNames = {
  quote: 'border-l-2 border-border pl-3',
  listMarker: 'text-muted-foreground',
  codeBlock: 'rounded-2xl border border-border bg-sidebar',
  codeText: 'type-code text-foreground',
} as const;

// A link underlines in the ring colour: a DOM element takes it as a class, a React Native view resolves it.
export const markdownLinkClassNames = {
  underline: 'underline underline-offset-2',
  domColor: 'decoration-ring',
  viewColor: 'text-ring',
} as const;
