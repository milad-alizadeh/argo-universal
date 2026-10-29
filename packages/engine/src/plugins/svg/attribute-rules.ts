import type { SvgAstNode } from './types';

const common = [
  'id',
  'fill',
  'fillRule',
  'fillOpacity',
  'stroke',
  'strokeWidth',
  'strokeLinecap',
  'strokeLinejoin',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'opacity',
  'clipPath',
  'transform',
] as const;

const attributes = {
  svg: new Set([
    ...common,
    'x',
    'y',
    'width',
    'height',
    'viewBox',
    'preserveAspectRatio',
    'xmlns',
  ]),
  g: new Set(common),
  defs: new Set(['id']),
  path: new Set([...common, 'd']),
  rect: new Set([...common, 'x', 'y', 'width', 'height', 'rx', 'ry']),
  circle: new Set([...common, 'cx', 'cy', 'r']),
  ellipse: new Set([...common, 'cx', 'cy', 'rx', 'ry']),
  line: new Set([...common, 'x1', 'y1', 'x2', 'y2']),
  polyline: new Set([...common, 'points']),
  polygon: new Set([...common, 'points']),
  text: new Set([
    ...common,
    'x',
    'y',
    'dx',
    'dy',
    'rotate',
    'textAnchor',
    'fontSize',
    'fontWeight',
    'fontFamily',
    'dominantBaseline',
    'letterSpacing',
    'textLength',
    'lengthAdjust',
  ]),
  tspan: new Set([
    ...common,
    'x',
    'y',
    'dx',
    'dy',
    'rotate',
    'textAnchor',
    'fontSize',
    'fontWeight',
    'fontFamily',
    'dominantBaseline',
    'letterSpacing',
    'textLength',
    'lengthAdjust',
  ]),
  linearGradient: new Set([
    'id',
    'x1',
    'y1',
    'x2',
    'y2',
    'gradientUnits',
    'gradientTransform',
    'spreadMethod',
    'href',
    'xlinkHref',
  ]),
  radialGradient: new Set([
    'id',
    'cx',
    'cy',
    'r',
    'fx',
    'fy',
    'fr',
    'gradientUnits',
    'gradientTransform',
    'spreadMethod',
    'href',
    'xlinkHref',
  ]),
  stop: new Set(['offset', 'stopColor', 'stopOpacity']),
  clipPath: new Set(['id', 'clipPathUnits', 'transform']),
} satisfies Record<SvgAstNode['tag'], ReadonlySet<string>>;

export const allowedElements = new Set(Object.keys(attributes));

export function attributesFor(tag: string): ReadonlySet<string> | undefined {
  return Object.entries(attributes).find(([name]) => name === tag)?.[1];
}

export const referenceAttributes = new Set(['href', 'xlinkHref']);

export const urlAttributes = new Set(['fill', 'stroke', 'clipPath']);
