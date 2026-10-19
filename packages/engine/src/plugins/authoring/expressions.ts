import type { CallExpression, Expression } from 'oxc-parser';
import { z } from 'zod';

export function memberPath(node: Expression): string {
  if (node.type === 'Identifier') return node.name;

  if (node.type !== 'MemberExpression') return '';

  return `${memberPath(node.object)}.${memberName(node)}`;
}

function memberName(
  node: Extract<Expression, { type: 'MemberExpression' }>,
): string {
  if (!node.computed) return node.property.name;

  return node.property.type === 'Literal' ? String(node.property.value) : '';
}

export function firstString(node: CallExpression): string | undefined {
  const value = node.arguments.at(0);

  if (value?.type !== 'Literal') return;

  return z.string().safeParse(value.value).data;
}
