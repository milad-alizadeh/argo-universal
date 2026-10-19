const names = [
  'circle',
  'clipPath',
  'defs',
  'ellipse',
  'g',
  'line',
  'linearGradient',
  'path',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'text',
  'tspan',
];

// The Server keeps only parse's XML tree. Its native tag constructors are never instantiated.
const SvgTag = (): null => null;

export const tags = Object.fromEntries(names.map((name) => [name, SvgTag]));
