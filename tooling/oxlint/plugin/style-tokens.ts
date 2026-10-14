import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type Problem = 'arbitraryValue' | 'paletteColour' | 'rawColour';

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

// Tailwind utilities that take a colour.
const colourUtilities = new Set([
  'bg',
  'text',
  'border',
  'border-x',
  'border-y',
  'border-t',
  'border-r',
  'border-b',
  'border-l',
  'border-s',
  'border-e',
  'ring',
  'ring-offset',
  'inset-ring',
  'outline',
  'fill',
  'stroke',
  'divide',
  'from',
  'via',
  'to',
  'shadow',
  'inset-shadow',
  'drop-shadow',
  'accent',
  'caret',
  'decoration',
  'placeholder',
]);

// Tailwind's palette hues; each takes a shade, `neutral-100`.
const hues = new Set([
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'taupe',
  'olive',
  'mauve',
  'mist',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]);

// A utility on white, black or a hue's shade: `bg-white`, `ring-offset-neutral-100`.
const paletteName =
  /^(?<utility>[a-z-]+?)-(?:white|black|(?<hue>[a-z]+)-\d{2,3})$/u;

type PaletteParts = Record<string, string | undefined>;

const isHue = (hue: string | undefined): boolean =>
  hue === undefined || hues.has(hue);

const isPaletteColour = (parts: PaletteParts): boolean =>
  colourUtilities.has(parts.utility ?? '') && isHue(parts.hue);

// A colour utility on a Tailwind palette shade rather than an Argo token: `text-white`, `dark:bg-neutral-900`, `!shadow-black/5`.
function isPaletteClass(word: string): boolean {
  const name = word
    .slice(word.lastIndexOf(':') + 1)
    .replaceAll(/^[!-]|!$|\/\d+$/gu, '');

  const parts = paletteName.exec(name)?.groups;

  return parts !== undefined && isPaletteColour(parts);
}

const hasPaletteClass = (text: string): boolean =>
  text.split(/\s+/u).some(isPaletteClass);

// Each problem and its test, the first match reported.
const problemTests: [Problem, (text: string) => boolean][] = [
  ['rawColour', hasRawColour],
  ['paletteColour', hasPaletteClass],
  ['arbitraryValue', (text): boolean => arbitraryClass.test(text)],
];

// What a piece of source text breaks, if anything.
const styleProblem = (text: string): Problem | undefined =>
  problemTests.find(([, test]): boolean => test(text))?.[0];

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
      paletteColour:
        'No Tailwind palette colours: use an Argo colour token from tooling/uniwind/theme.css (bg-card, text-foreground, border-border, …).',
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
