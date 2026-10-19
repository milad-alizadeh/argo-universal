export const svgCharacterLimit = 131_072;

export const svgElementLimit = 2_000;

export const svgDepthLimit = 32;

export type SvgAttributeValue = number | string;

export interface SvgAstNode {
  tag: string;
  props: Record<string, SvgAttributeValue>;
  children: Array<SvgAstNode | string>;
}

export type SvgParser = (source: string) => SvgAstNode | null;

export type SvgSanitization =
  | { ok: true; xml: string }
  | { ok: false; reason: string };
