import type { parseExpression } from '@babel/parser';

type Plain<T> = T extends unknown
  ? Omit<T, 'comments' | 'errors' | 'tokens'>
  : never;

export type Expression = Plain<ReturnType<typeof parseExpression>>;

export type Element = Extract<Expression, { type: 'JSXElement' }>;

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

function negative(node: Expression): string {
  if (node.type !== 'UnaryExpression')
    throw new Error(`Unsupported executable JSX expression: ${node.type}`);

  if (node.operator !== '-') throw new Error('Unsupported JSX operator');

  return negativeNumber(node.argument);
}

function negativeNumber(
  node: Extract<Expression, { type: 'UnaryExpression' }>['argument'],
): string {
  if (node.type !== 'NumericLiteral')
    throw new Error('SVG number must be static');

  return String(-node.value);
}

export function literal(node: Expression): string {
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral')
    return String(node.value);

  return negative(node);
}

function styleProperty(
  prop: Extract<Expression, { type: 'ObjectExpression' }>['properties'][number],
): string {
  if (prop.type !== 'ObjectProperty')
    throw new Error('Unsupported SVG property');

  if (prop.computed) throw new Error('Unsupported SVG computed property');

  return propertyValue(prop);
}

function propertyValue(prop: Property): string {
  if (prop.key.type !== 'Identifier')
    throw new Error('Unsupported SVG property key');

  return `${cssName(prop.key.name)}:${staticStyle(prop.value)}`;
}

export function styleLiteral(node: Expression): string {
  if (node.type !== 'ObjectExpression')
    throw new Error('SVG style must be a literal object');

  return node.properties.map(styleProperty).join(';');
}

type Property = Extract<
  Extract<Expression, { type: 'ObjectExpression' }>['properties'][number],
  { type: 'ObjectProperty' }
>;

function staticStyle(value: Property['value']): string {
  if (value.type === 'StringLiteral' || value.type === 'NumericLiteral')
    return String(value.value);
  throw new Error('SVG style must be static');
}
