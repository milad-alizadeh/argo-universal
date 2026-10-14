import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type Problem = 'arbitraryValue' | 'rawColour';

type TokenVisitor = {
  Literal: NonNullable<Visitor['Literal']>;
  TemplateElement: NonNullable<Visitor['TemplateElement']>;
};

// A class with brackets: `w-[390px]`, `data-[state=open]:bg-muted`, `[&_svg]:size-4`; a Markdown `[spec]: https://…` has no class after its colon.
const arbitraryClass =
  /(?:^|\s)[\w!:@/.*&-]*(?:-\[[^\s\]]+\]|\[[^\s\]]+\]:[\w!@/.*-])/u;

// A hex colour on its own, as a style value or a native colour prop takes it: `'#e5e5e5b3'`.
const hexColour = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu;

// A hex colour inside a class: `bg-[#fff]`, `shadow-[0_0_0_1px_#0000000d]`.
const bracketedHex = /[[_,]#[\da-f]{3}/iu;

// A colour function with typed channels: `rgb(0 0 0 / 5%)`, `oklch(64% 0 0)`; `color-mix` over a token is fine.
const colourFunction = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/iu;

const colourPatterns = [hexColour, bracketedHex, colourFunction];

const hasRawColour = (text: string): boolean =>
  colourPatterns.some((pattern): boolean => pattern.test(text));

// What a piece of source text breaks, if anything.
function styleProblem(text: string): Problem | undefined {
  if (hasRawColour(text)) return 'rawColour';

  return arbitraryClass.test(text) ? 'arbitraryValue' : undefined;
}

const report = (context: Context, node: ESTree.Node, text: string): void => {
  const messageId = styleProblem(text);

  if (messageId) context.report({ node, messageId });
};

export const styleTokens = defineRule({
  meta: {
    type: 'problem',
    messages: {
      arbitraryValue:
        'No arbitrary Tailwind values: use a scale step (spacing, size, radius, type role) or a token in tooling/uniwind/theme.css.',
      rawColour:
        'No raw colours: add or use a colour token in tooling/uniwind/theme.css and read it with a class or useCSSVariable.',
    },
  },
  create: (context): TokenVisitor => ({
    Literal: (node): void => {
      if (typeof node.value === 'string') report(context, node, node.value);
    },
    TemplateElement: (node): void => {
      report(context, node, node.value.cooked ?? node.value.raw);
    },
  }),
});
