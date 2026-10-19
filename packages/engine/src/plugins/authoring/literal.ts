import type { WireJson } from '@repo/contracts/plugins/wire';
import type { Expression, ObjectProperty } from 'oxc-parser';

export function literalValue(node: Expression): WireJson | undefined {
  const reader = readers.get(node.type);

  return reader?.(node);
}

const readers = new Map<string, (node: Expression) => WireJson | undefined>([
  ['Literal', scalar],
  ['ArrayExpression', array],
  ['ObjectExpression', object],
  ['UnaryExpression', unary],
  ['TemplateLiteral', template],
]);

function scalar(node: Expression): WireJson | undefined {
  if (node.type !== 'Literal') return;
  const value = node.value;

  if (isUnsupported(value)) return;

  return value;
}

function array(node: Expression): WireJson | undefined {
  if (node.type !== 'ArrayExpression') return;

  const values = node.elements.map((item) =>
    item && item.type !== 'SpreadElement' ? literalValue(item) : undefined,
  );

  return values.includes(undefined)
    ? undefined
    : values.filter((value) => value !== undefined);
}

function object(node: Expression): WireJson | undefined {
  if (node.type !== 'ObjectExpression') return;
  const entries = node.properties.map(property);

  return entries.includes(undefined)
    ? undefined
    : Object.fromEntries(entries.filter((entry) => entry !== undefined));
}

function property(
  node: Extract<Expression, { type: 'ObjectExpression' }>['properties'][number],
): [string, WireJson] | undefined {
  if (node.type !== 'Property') return;

  if (dynamicProperty(node)) return;

  return propertyValue(node);
}

function propertyValue(node: ObjectProperty): [string, WireJson] | undefined {
  const key = propertyKey(node.key);
  const value = literalValue(node.value);

  return key !== undefined && value !== undefined ? [key, value] : undefined;
}

function unary(node: Expression): WireJson | undefined {
  if (node.type !== 'UnaryExpression') return;
  const value = literalValue(node.argument);

  return typeof value === 'number' ? signed(node.operator, value) : undefined;
}

function template(node: Expression): WireJson | undefined {
  if (node.type !== 'TemplateLiteral' || node.expressions.length) return;

  return node.quasis
    .map((part) => part.value.cooked ?? part.value.raw)
    .join('');
}

function positive(operator: string, value: number): number | undefined {
  return operator === '+' ? value : undefined;
}

function propertyKey(node: ObjectProperty['key']): string | undefined {
  if (node.type === 'Identifier') return node.name;

  return node.type === 'Literal' ? stringKey(node.value) : undefined;
}

function dynamicProperty(node: ObjectProperty): boolean {
  return node.computed || node.method;
}

function stringKey(
  value: Extract<Expression, { type: 'Literal' }>['value'],
): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isUnsupported(
  value: Extract<Expression, { type: 'Literal' }>['value'],
): value is bigint | RegExp {
  return typeof value === 'bigint' || value instanceof RegExp;
}

function signed(operator: string, value: number): number | undefined {
  return operator === '-' ? -value : positive(operator, value);
}
