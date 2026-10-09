import { layerAt, layerPath, type Snapshot } from './snapshot-model.mts';
import { sameValue } from './token-drift.mts';
import { normaliseValue, resolveTokens, type Tokens } from './token-values.mts';

// Values typed straight into a style where the design system has a scale for them.
const COLOR = /^--color-/;
const SPACING = /^--spacing-/;
const FONT_TOKEN = /^--font-(?!weight-)/;
const SCALES: Record<string, RegExp> = {
  color: COLOR,
  backgroundColor: COLOR,
  borderColor: COLOR,
  fontSize: /^--text-/,
  lineHeight: /^--leading-/,
  fontWeight: /^--font-weight-/,
  fontFamily: FONT_TOKEN,
  gap: SPACING,
  padding: SPACING,
  paddingInline: SPACING,
  paddingBlock: SPACING,
  paddingTop: SPACING,
  paddingRight: SPACING,
  paddingBottom: SPACING,
  paddingLeft: SPACING,
  borderRadius: /^--radius-/,
};
// Nothing to tokenise: no space, no colour.
const NEUTRAL = new Set(['0px', '0', '#00000000']);
const EXAMPLES = 3;

export interface LiteralUse {
  property: string;
  value: string;
  count: number;
  // Tokens with this value; none means the value is off the scale.
  tokens: string[];
  examples: string[];
}

interface Use {
  property: string;
  value: string;
  layerId: string;
}

function usesOf(snapshot: Snapshot): Use[] {
  return Object.entries(snapshot.styles).flatMap(([layerId, styles]): Use[] =>
    Object.entries(styles)
      .filter(([property]): boolean => property in SCALES)
      .map(([property, value]): Use => ({
        property,
        value: String(value),
        layerId,
      }))
      .filter((use): boolean => !use.value.includes('var(')),
  );
}

function tokensFor(paper: Tokens, use: Use): string[] {
  const scale = SCALES[use.property];
  const value = normaliseValue(use.value);
  return Object.entries(paper)
    .filter(([name]): boolean => scale?.test(name) === true)
    .filter(([, token]): boolean => sameValue(value, token))
    .map(([name]): string => name);
}

function grouped(uses: Use[]): Use[][] {
  const groups = new Map<string, Use[]>();
  for (const use of uses) {
    const key = `${use.property}\u0000${normaliseValue(use.value)}`;
    groups.set(key, [...(groups.get(key) ?? []), use]);
  }
  return [...groups.values()];
}

function examplesOf(snapshot: Snapshot, uses: Use[]): string[] {
  return uses
    .slice(0, EXAMPLES)
    .map((use): string => layerPath(snapshot, layerAt(snapshot, use.layerId)));
}

function literalOf(
  snapshot: Snapshot,
  paper: Tokens,
  uses: Use[],
): LiteralUse[] {
  const [first] = uses;
  if (!first) return [];
  const tokens = tokensFor(paper, first);
  const { property, value } = first;
  const examples = examplesOf(snapshot, uses);
  return [{ property, value, count: uses.length, tokens, examples }];
}

function firstFamily(stack: string): string {
  return (stack.split(',')[0] ?? '').trim().replaceAll(/["']/g, '');
}

// Paper draws var(--font-*) in its default font, so a font token's first family is written as a literal.
function tokenFamilies(paper: Tokens): Set<string> {
  return new Set(
    Object.entries(paper)
      .filter(([name]): boolean => FONT_TOKEN.test(name))
      .map(([, stack]): string => firstFamily(stack)),
  );
}

function isExpected(use: Use, families: Set<string>): boolean {
  if (NEUTRAL.has(normaliseValue(use.value))) return true;
  return use.property === 'fontFamily' && families.has(firstFamily(use.value));
}

export function findLiteralDrift(snapshot: Snapshot): LiteralUse[] {
  const paper = resolveTokens(snapshot.tokens);
  const families = tokenFamilies(paper);
  const uses = usesOf(snapshot).filter(
    (use): boolean => !isExpected(use, families),
  );
  return grouped(uses)
    .flatMap((group): LiteralUse[] => literalOf(snapshot, paper, group))
    .toSorted((a, b): number => b.count - a.count);
}
