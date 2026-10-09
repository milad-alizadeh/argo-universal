import { formatHex8, parse } from 'culori';

type Tokens = ReadonlyMap<string, string>;

export type ThemeSources = {
  /** Tailwind's own `theme.css`, the defaults `theme.css` builds on. */
  tailwindDefaults: string;
  /** Our `theme.css`. */
  theme: string;
  /** Paper's `get_tokens` CSS export (`paper-tokens.css`). */
  paper: string;
};

const remSize = 16;
const varPattern = /var\((--[\w-]+)\)/g;
const lengthPattern = /^(-?[\d.]+)(rem|px)$/;
const calcPattern = /^calc\((-?[\d.]+)px ([+-]) (-?[\d.]+)px\)$/;
/** Namespaces where every `theme.css` token must also exist in Paper. */
const sharedNamespaces = [
  '--text-',
  '--leading-',
  '--font-weight-',
  '--tracking-',
];

function stripComments(css: string): string {
  const start = css.indexOf('/*');
  if (start < 0) {
    return css;
  }
  return (
    css.slice(0, start) + stripComments(css.slice(css.indexOf('*/', start) + 2))
  );
}

function readDeclarations(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const statement of stripComments(css).split(/[;{}]/)) {
    const declaration = statement.trim();
    const colon = declaration.indexOf(':');
    if (declaration.startsWith('--') && colon > 0) {
      const value = declaration.slice(colon + 1).replaceAll(/\s+/g, ' ');
      tokens.set(declaration.slice(0, colon), value.trim());
    }
  }
  return tokens;
}

function readBlock(css: string, opener: string): string {
  const start = css.indexOf(opener);
  if (start < 0) {
    throw new Error(`theme.css has no "${opener}" block`);
  }
  return css.slice(start, css.indexOf('}', start));
}

/** The light-mode values the app uses, in the order CSS applies them. */
function readAppTokens({ tailwindDefaults, theme }: ThemeSources): Tokens {
  const themeBlock = theme.slice(0, theme.indexOf('\n}\n'));
  return new Map([
    ...readDeclarations(tailwindDefaults),
    ...readDeclarations(themeBlock),
    ...readDeclarations(readBlock(theme, '@variant light {')),
  ]);
}

function resolve(name: string, tokens: Tokens): string | undefined {
  return tokens
    .get(name)
    ?.replace(varPattern, (reference, referenced: string): string => {
      return resolve(referenced, tokens) ?? reference;
    });
}

function toPixels(value: string): number | undefined {
  const length = lengthPattern.exec(value);
  if (length) {
    return Number(length[1]) * (length[2] === 'rem' ? remSize : 1);
  }
  const sum = calcPattern.exec(value);
  if (!sum) {
    return undefined;
  }
  const sign = sum[2] === '+' ? 1 : -1;
  return Number(sum[1]) + sign * Number(sum[3]);
}

/** One spelling per value, so `0.875rem`, `14px` and `calc(18px - 4px)` all compare equal. */
function normalise(value: string): string {
  const pixels = toPixels(value);
  if (pixels !== undefined) {
    return `${pixels}px`;
  }
  const colour = parse(value);
  return colour ? formatHex8(colour) : value.replaceAll("'", '"');
}

function describe(name: string, tokens: Tokens): string | undefined {
  const value = resolve(name, tokens);
  return value === undefined ? undefined : normalise(value);
}

function compare(name: string, paper: Tokens, app: Tokens): string[] {
  const inPaper = describe(name, paper);
  const inApp = describe(name, app);
  if (inApp === undefined) {
    return [`${name} is in Paper but not in theme.css`];
  }
  return inPaper === inApp
    ? []
    : [`${name}: Paper ${inPaper}, theme.css ${inApp}`];
}

function findMissingInPaper(theme: string, paper: Tokens): string[] {
  return [...readDeclarations(theme).keys()]
    .filter((name): boolean =>
      sharedNamespaces.some((prefix) => name.startsWith(prefix)),
    )
    .filter((name): boolean => !paper.has(name))
    .map((name): string => `${name} is in theme.css but not in Paper`);
}

/** Every difference between Paper's tokens and the app's, one line each; empty when in sync. */
export function findPaperTokenDrift(sources: ThemeSources): string[] {
  const paper = readDeclarations(sources.paper);
  const app = readAppTokens(sources);
  return [
    ...[...paper.keys()].flatMap((name): string[] => compare(name, paper, app)),
    ...findMissingInPaper(sources.theme, paper),
  ];
}
