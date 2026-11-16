import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { ManifestIcon } from '@repo/contracts/plugins/manifest-fields';
import { parseSvg } from '../svg/parser';
import { sanitizeSvg } from '../svg/sanitizer';
import { serializeSvg } from '../svg/serialization';
import type { SvgAstNode } from '../svg/types';
import { ManifestFieldError } from './manifest';

// An icon is a glyph, not artwork: a few paths fit well inside this.
export const iconByteLimit = 32_768;

const iconField = ['icon', 'svg'];

const refused = (message: string): ManifestFieldError =>
  new ManifestFieldError(iconField, message);

// A second colour has no place in a one-colour icon; a gradient or pattern is one.
const colouredTags = new Set(['linearGradient', 'radialGradient', 'pattern']);

type Props = SvgAstNode['props'];

// A paint the icon sets, other than none, takes the App's tint.
const recolour = ([name, value]: [string, Props[string]]): [
  string,
  Props[string],
] => (isPaint(name, value) ? [name, 'currentColor'] : [name, value]);

const isPaint = (name: string, value: Props[string]): boolean =>
  (name === 'fill' || name === 'stroke') && value !== 'none';

const painted = (props: Props): Props =>
  Object.fromEntries(Object.entries(props).map(recolour));

function monochrome(node: SvgAstNode): SvgAstNode {
  if (colouredTags.has(node.tag))
    throw refused(`icon.svg must be one colour; it holds a ${node.tag}`);

  return {
    ...node,
    props: painted(node.props),
    children: node.children.map((child) =>
      typeof child === 'string' ? child : monochrome(child),
    ),
  };
}

// The root paints what sets no colour of its own, and sizes to the box the App gives it.
const unsized = (props: Props): Props =>
  Object.fromEntries(
    Object.entries(props).filter(
      ([name]) => name !== 'width' && name !== 'height',
    ),
  );

function rootOf(node: SvgAstNode): SvgAstNode {
  return { ...node, props: { fill: 'currentColor', ...unsized(node.props) } };
}

async function iconSource(directory: string, file: string): Promise<string> {
  const path = join(directory, file);

  const size = await stat(path).then(
    (found) => found.size,
    () => {
      throw refused(`icon.svg ${file} is missing`);
    },
  );

  if (size > iconByteLimit)
    throw refused(`icon.svg must be at most ${iconByteLimit} bytes`);

  return readFile(path, 'utf8');
}

// A declaration or a doctype could define entities; an icon file needs neither, so it never reaches the parser.
const declaration = /<!(?!--)/;

function rootOfSource(source: string): SvgAstNode {
  if (declaration.test(source))
    throw refused('icon.svg must hold no declaration');

  return svgRoot(parseRoot(source));
}

function svgRoot(root: SvgAstNode | null): SvgAstNode {
  if (root?.tag !== 'svg')
    throw refused('icon.svg is refused: root must be svg');

  return root;
}

function parseRoot(source: string): SvgAstNode | null {
  try {
    return parseSvg(source);
  } catch (error) {
    throw refused(`icon.svg is refused: ${String(error)}`);
  }
}

// Painted in one colour first, since the sanitizer, as for any Plugin Svg, takes no literal colour.
function markupOf(source: string): string {
  const painted = serializeSvg(monochrome(rootOf(rootOfSource(source))));

  const sanitized = sanitizeSvg(painted, parseSvg);

  if (!sanitized.ok) throw refused(`icon.svg is refused: ${sanitized.reason}`);

  return sanitized.xml;
}

/*
 * The manifest's own icon as the App draws it (ADR-0058): the SVG file, sanitized as a Plugin's Svg is, every paint
 * made `currentColor` so the App tints it as it tints a symbol. A Plugin with no `icon.svg` has none.
 */
export async function readIconMarkup(
  directory: string,
  icon: ManifestIcon,
): Promise<string | undefined> {
  if (icon.svg === undefined) return undefined;

  return markupOf(await iconSource(directory, icon.svg));
}
