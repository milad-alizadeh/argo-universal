import { parseExpression } from '@babel/parser';

type Plain<T> = T extends unknown
  ? Omit<T, 'comments' | 'errors' | 'tokens'>
  : never;
type Expression = Plain<ReturnType<typeof parseExpression>>;
type Element = Extract<Expression, { type: 'JSXElement' }>;
const tags = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'clipPath',
  'linearGradient',
  'radialGradient',
  'stop',
  'title',
]);

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function cssName(value: string): string {
  return value.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function literal(node: Expression): string {
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral')
    return String(node.value);
  if (
    node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'NumericLiteral'
  )
    return String(-node.argument.value);
  throw new Error(`Unsupported executable JSX expression: ${node.type}`);
}

function styleLiteral(node: Expression): string {
  if (node.type !== 'ObjectExpression')
    throw new Error('SVG style must be a literal object');
  return node.properties
    .map((prop) => {
      if (
        prop.type !== 'ObjectProperty' ||
        prop.computed ||
        prop.key.type !== 'Identifier'
      )
        throw new Error('Unsupported SVG style property');
      if (
        prop.value.type !== 'StringLiteral' &&
        prop.value.type !== 'NumericLiteral'
      )
        throw new Error('SVG style must be static');
      return `${cssName(prop.key.name)}:${literal(prop.value)}`;
    })
    .join(';');
}

function attribute(
  attr: Element['openingElement']['attributes'][number],
): string {
  if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier')
    throw new Error('Unsupported SVG attribute');
  const name = attr.name.name;
  if (name === 'id') return '';
  if (name.startsWith('on') || name === 'href')
    throw new Error(`Unsafe SVG attribute ${name}`);
  if (attr.value?.type === 'StringLiteral')
    return ` ${name === 'viewBox' ? name : cssName(name)}="${escapeHtml(attr.value.value)}"`;
  if (
    attr.value?.type !== 'JSXExpressionContainer' ||
    attr.value.expression.type === 'JSXEmptyExpression'
  )
    throw new Error('SVG attribute must be static');
  const value =
    name === 'style'
      ? styleLiteral(attr.value.expression)
      : literal(attr.value.expression);
  return ` ${cssName(name)}="${escapeHtml(value)}"`;
}

function render(element: Element): string {
  const name = element.openingElement.name;
  if (name.type !== 'JSXIdentifier' || !tags.has(name.name))
    throw new Error('Unsupported SVG tag');
  const children = element.children
    .map((child) => {
      if (child.type === 'JSXText') return escapeHtml(child.value.trim());
      if (child.type === 'JSXElement') return render(child);
      throw new Error('Unsupported SVG child');
    })
    .join('');
  return `<${name.name}${element.openingElement.attributes.map(attribute).join('')}>${children}</${name.name}>`;
}

export function svgFromJsx(jsx: string): string {
  if (/url\(\s*["']?#/.test(jsx))
    throw new Error(
      'SVG definition references require an explicit transfer implementation',
    );
  const expression = parseExpression(jsx, { plugins: ['jsx'] });
  if (expression.type !== 'JSXElement')
    throw new Error('Expected a static SVG element');
  return render(expression);
}
