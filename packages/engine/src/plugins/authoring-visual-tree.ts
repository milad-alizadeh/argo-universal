import type { WireNode } from '@repo/contracts/plugins/wire';
import type { JSXElement, JSXOpeningElement, JSXAttribute } from 'oxc-parser';
import type { z } from 'zod';
import { literalValue } from './authoring-literal';
import { visualName } from './authoring-visual-imports';

export function visualTree(
  node: JSXElement,
  names: Map<string, string>,
): WireNode {
  return {
    type: visualName(node.openingElement, names) ?? 'unsupported',
    key: sourceKey(node.openingElement),
    props: drawingProps(node.openingElement),
    children: node.children
      .filter((child) => child.type === 'JSXElement')
      .map((child) => visualTree(child, names)),
    slots: {},
  };
}

export function propsOf(node: JSXOpeningElement): WireNode['props'] {
  return Object.fromEntries(node.attributes.flatMap(attributeEntry));
}

function attributeEntry(
  node: JSXOpeningElement['attributes'][number],
): Array<[string, Exclude<ReturnType<typeof attributeValue>, undefined>]> {
  if (node.type !== 'JSXAttribute') return [];

  return namedAttribute(node);
}

function namedAttribute(
  node: JSXAttribute,
): Array<[string, Exclude<ReturnType<typeof attributeValue>, undefined>]> {
  if (node.name.type !== 'JSXIdentifier') return [];
  const value = attributeValue(node);

  return value === undefined ? [] : [[node.name.name, value]];
}

function attributeValue(
  node: JSXAttribute,
): WireNode['props'][string] | undefined {
  const value = node.value;

  if (!value) return true;

  if (value.type === 'Literal') return value.value;

  return expressionValue(value);
}

function expressionValue(
  value: NonNullable<JSXAttribute['value']>,
): WireNode['props'][string] | undefined {
  if (value.type !== 'JSXExpressionContainer') return;

  if (value.expression.type === 'JSXEmptyExpression') return;

  return literalValue(value.expression);
}

function drawingProps(node: JSXOpeningElement): WireNode['props'] {
  const props = propsOf(node);
  delete props.key;

  return props;
}

export function requiredPropReason(
  node: JSXOpeningElement,
  schema: z.ZodObject,
): string | undefined {
  if (
    node.attributes.some((attribute) => attribute.type === 'JSXSpreadAttribute')
  )
    return;

  const names = new Set(node.attributes.flatMap(attributeName));

  const missing = Object.entries(schema.shape).find(
    ([name, field]) => !field.isOptional() && !names.has(name),
  );

  return missing ? `required prop ${missing[0]} missing` : undefined;
}

function sourceKey(node: JSXOpeningElement): string {
  const key = propsOf(node).key;

  return typeof key === 'string' || typeof key === 'number' ? String(key) : '';
}

function attributeName(
  node: JSXOpeningElement['attributes'][number],
): string[] {
  if (node.type !== 'JSXAttribute') return [];

  return node.name.type === 'JSXIdentifier' ? [node.name.name] : [];
}
