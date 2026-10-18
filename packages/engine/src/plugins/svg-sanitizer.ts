export const svgCharacterLimit = 131_072;
export const svgElementLimit = 2_000;
export const svgDepthLimit = 32;

export interface SvgAstNode {
  tag: string;
  props: Record<string, unknown>;
  children: Array<SvgAstNode | string>;
}

export type SvgParser = (source: string) => SvgAstNode | null;

export type SvgSanitization =
  | { ok: true; xml: string }
  | { ok: false; reason: string };

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

const attributes: Record<string, ReadonlySet<string>> = {
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
};

const numericAttributes = new Set([
  'x',
  'y',
  'width',
  'height',
  'viewBox',
  'd',
  'transform',
  'gradientTransform',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x1',
  'y1',
  'x2',
  'y2',
  'dx',
  'dy',
  'rotate',
  'strokeWidth',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'fillOpacity',
  'strokeOpacity',
  'opacity',
  'fontSize',
  'letterSpacing',
  'textLength',
  'offset',
  'fr',
  'fx',
  'fy',
  'points',
]);

const referenceAttributes = new Set(['href', 'xlinkHref']);
const colorAttributes = new Set(['fill', 'stroke', 'stopColor']);
const localUrlAttributes = new Set(['fill', 'stroke', 'clipPath']);
const allowedElements = new Set(Object.keys(attributes));
const idPattern = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const numberPattern = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
const forbiddenNumberWord =
  /(?:^|[^a-z])(?:nan|[+-]?inf(?:inity)?)(?:$|[^a-z])/i;

interface ScanResult {
  roots: number;
  declarations: string | null;
}

function scanMarkup(source: string): ScanResult {
  let roots = 0;
  let depth = 0;
  let elements = 0;
  let declarations: string | null = null;

  for (let index = 0; index < source.length;) {
    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4);

      if (end < 0) throw new Error('malformed XML comment');
      index = end + 3;
      continue;
    }

    if (source.startsWith('<![CDATA[', index)) {
      const end = source.indexOf(']]>', index + 9);

      if (end < 0) throw new Error('malformed CDATA section');
      index = end + 3;
      continue;
    }

    if (source[index] !== '<') {
      index += 1;
      continue;
    }

    if (source.startsWith('<?', index)) {
      const end = source.indexOf('?>', index + 2);

      if (end < 0) throw new Error('malformed processing instruction');
      index = end + 2;
      continue;
    }

    if (source.startsWith('</', index)) {
      const end = tagEnd(source, index + 2);

      if (depth === 0) throw new Error('unexpected closing tag');
      depth -= 1;
      index = end + 1;
      continue;
    }

    if (source.startsWith('<!', index)) {
      const declaration = /^<!\s*(doctype|entity)\b/i.exec(source.slice(index));

      if (declaration)
        declarations = declaration[1]?.toLowerCase() ?? 'declaration';
      index = tagEnd(source, index + 2) + 1;
      continue;
    }

    const end = tagEnd(source, index + 1);
    const tag = source.slice(index + 1, end);
    const selfClosing = /\/\s*$/.test(tag);

    if (depth === 0) roots += 1;
    elements += 1;
    if (elements > svgElementLimit) throw new Error('element cap exceeded');
    if (!selfClosing && depth + 1 > svgDepthLimit)
      throw new Error('depth cap exceeded');
    if (!selfClosing) depth += 1;
    index = end + 1;
  }

  if (depth !== 0) throw new Error('unclosed element');
  return { roots, declarations };
}

function tagEnd(source: string, from: number): number {
  let quote = '';

  for (let index = from; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '>') return index;
  }

  throw new Error('unterminated tag');
}

export function sanitizeSvg(xml: string, parse: SvgParser): SvgSanitization {
  if (xml.length > svgCharacterLimit)
    return {
      ok: false,
      reason: `character cap exceeded (${svgCharacterLimit})`,
    };

  let scan: ScanResult;

  try {
    scan = scanMarkup(xml);
  } catch (error) {
    return { ok: false, reason: errorMessage(error) };
  }

  if (scan.declarations)
    return { ok: false, reason: `${scan.declarations} declaration refused` };
  if (scan.roots !== 1)
    return { ok: false, reason: 'exactly one root element is required' };

  let root: SvgAstNode | null;

  try {
    root = parse(xml);
  } catch (error) {
    return { ok: false, reason: `invalid XML: ${errorMessage(error)}` };
  }

  if (!root) return { ok: false, reason: 'missing root element' };
  if (root.tag !== 'svg') return { ok: false, reason: 'root must be svg' };

  const ids = new Set<string>();
  let elementCount = 0;

  try {
    inspect(root, 1, ids, (count) => (elementCount += count));
    if (elementCount > svgElementLimit)
      throw new Error(`element cap exceeded (${svgElementLimit})`);
    inspectReferences(root, ids);
    const canonical = serialize(root);

    if (canonical.length > svgCharacterLimit)
      throw new Error(
        `serialized character cap exceeded (${svgCharacterLimit})`,
      );

    return { ok: true, xml: canonical };
  } catch (error) {
    return { ok: false, reason: errorMessage(error) };
  }
}

function inspect(
  node: SvgAstNode,
  depth: number,
  ids: Set<string>,
  count: (value: number) => void,
): void {
  count(1);
  if (depth > svgDepthLimit)
    throw new Error(`depth cap exceeded (${svgDepthLimit})`);

  const tag = node.tag;
  if (!allowedElements.has(tag)) throw new Error(`element <${tag}> refused`);
  const allowed = attributes[tag];

  if (!allowed) throw new Error(`element <${tag}> refused`);

  for (const [name, value] of Object.entries(node.props)) {
    if (!allowed.has(name))
      throw new Error(`attribute ${name} refused on <${tag}>`);
    if (typeof value !== 'string' && typeof value !== 'number')
      throw new Error(`attribute ${name} must have a value`);
    const stringValue = String(value);

    if (/[&<>"']/.test(stringValue))
      throw new Error(`attribute ${name} contains unsupported XML characters`);
    if (name === 'xmlns' && stringValue !== 'http://www.w3.org/2000/svg')
      throw new Error('only the SVG namespace is allowed');
    if (name === 'id') {
      if (!idPattern.test(stringValue)) throw new Error('invalid id');
      if (ids.has(stringValue)) throw new Error(`duplicate id ${stringValue}`);
      ids.add(stringValue);
    }
    if (colorAttributes.has(name) && !validPaint(name, stringValue))
      throw new Error(`color ${stringValue} refused for ${name}`);
    if (stringValue.toLowerCase().includes('url(')) {
      if (!localUrlAttributes.has(name))
        throw new Error(`url() is not allowed in ${name}`);
      if (!/^url\(\s*#[A-Za-z_][A-Za-z0-9_.-]*\s*\)$/.test(stringValue))
        throw new Error(`external url() refused in ${name}`);
    }
    if (numericAttributes.has(name)) checkFiniteNumbers(name, stringValue);
    if (
      name === 'preserveAspectRatio' &&
      !/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: meet| slice)?)$/.test(
        stringValue,
      )
    )
      throw new Error('invalid preserveAspectRatio');
    if (name === 'fontWeight' && !/^(?:normal|bold|[1-9]00)$/.test(stringValue))
      throw new Error('invalid fontWeight');
    if (name === 'fontFamily' && !/^[A-Za-z0-9 _-]{1,64}$/.test(stringValue))
      throw new Error('invalid fontFamily');
    if (
      (name === 'gradientUnits' || name === 'clipPathUnits') &&
      !/^(?:userSpaceOnUse|objectBoundingBox)$/.test(stringValue)
    )
      throw new Error(`invalid ${name}`);
    if (
      name === 'spreadMethod' &&
      !/^(?:pad|reflect|repeat)$/.test(stringValue)
    )
      throw new Error('invalid spreadMethod');
  }

  for (const child of node.children) {
    if (typeof child === 'string') continue;
    inspect(child, depth + 1, ids, count);
  }
}

function validPaint(name: string, value: string): boolean {
  return (
    value === 'currentColor' ||
    value === 'none' ||
    (name !== 'stopColor' &&
      /^url\(\s*#[A-Za-z_][A-Za-z0-9_.-]*\s*\)$/.test(value))
  );
}

function checkFiniteNumbers(name: string, value: string): void {
  if (forbiddenNumberWord.test(value))
    throw new Error(`non-finite number in ${name}`);
  const numbers = value.match(numberPattern) ?? [];

  if (
    !numbers.length ||
    numbers.some((number) => !Number.isFinite(Number(number)))
  )
    throw new Error(`invalid numeric value in ${name}`);
  const rest = value.replace(numberPattern, '').replace(/[\s,%.]/g, '');

  if ((name === 'd' || name === 'points') && /^[a-zA-Z]*$/.test(rest)) return;
  if (
    (name === 'transform' || name === 'gradientTransform') &&
    /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\(\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:[\s,]+[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)*\s*\)\s*)+$/.test(
      value,
    )
  )
    return;
  if (
    rest &&
    !/^(?:userSpaceOnUse|objectBoundingBox|meet|slice|none)$/.test(rest)
  )
    throw new Error(`invalid numeric value in ${name}`);
}

function inspectReferences(node: SvgAstNode, ids: Set<string>): void {
  for (const [name, value] of Object.entries(node.props)) {
    if (!referenceAttributes.has(name) || value === undefined) continue;
    const stringValue = String(value);

    if (!stringValue.startsWith('#'))
      throw new Error(`external href refused in ${name}`);
    if (!ids.has(stringValue.slice(1)))
      throw new Error(`href target ${stringValue} is missing`);
  }
  for (const [name, value] of Object.entries(node.props)) {
    if (!localUrlAttributes.has(name) || typeof value !== 'string') continue;
    const reference = /^url\(\s*#([A-Za-z_][A-Za-z0-9_.-]*)\s*\)$/.exec(value);

    if (reference && !ids.has(reference[1]!))
      throw new Error(`url() target #${reference[1]} is missing`);
  }
  for (const child of node.children)
    if (typeof child !== 'string') inspectReferences(child, ids);
}

function serialize(node: SvgAstNode): string {
  const props = Object.entries(node.props)
    .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
    .map(([name, value]) => ` ${attributeName(name)}="${String(value)}"`)
    .join('');

  if (!node.children.length) return `<${node.tag}${props}/>`;
  const children = node.children
    .map((child) =>
      typeof child === 'string'
        ? `<![CDATA[${child.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
        : serialize(child),
    )
    .join('');

  return `<${node.tag}${props}>${children}</${node.tag}>`;
}

function attributeName(name: string): string {
  if (name === 'xlinkHref') return 'xlink:href';
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
