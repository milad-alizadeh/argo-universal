import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type SpacingVisitor = {
  JSXAttribute: NonNullable<Visitor['JSXAttribute']>;
};

type Expression = ESTree.Expression | ESTree.SpreadElement;

type Literal = Extract<Expression, { type: 'Literal' }>;

// A padding, margin, gap or space class, behind any variants and a negative sign: `px-4`, `wide:pt-0`, `-mx-4`, `gap-y-2`.
const spacingClass =
  /(?:^|[\s:])-?(?:[mp][belrstxy]?|gap(?:-[xy])?|space-[xy])-[\w.]+/u;

// `className`, and any slot class such as `contentClassName`.
const isClassProp = (attribute: ESTree.JSXAttribute): boolean =>
  attribute.name.type === 'JSXIdentifier' &&
  (attribute.name.name === 'className' ||
    attribute.name.name.endsWith('ClassName'));

const literalText = (node: Literal): string[] =>
  typeof node.value === 'string' ? [node.value] : [];

// The text an expression holds itself: a string, or a template's fixed parts.
function ownTexts(node: Expression): string[] {
  if (node.type === 'Literal') return literalText(node);

  return node.type === 'TemplateLiteral'
    ? node.quasis.map((quasi) => quasi.value.raw)
    : [];
}

// The expressions a class can come from inside another: both branches, and `cn(…)`'s arguments.
function branches(node: Expression): Expression[] {
  if (node.type === 'ConditionalExpression')
    return [node.consequent, node.alternate];

  if (node.type === 'LogicalExpression') return [node.left, node.right];

  return listed(node);
}

function listed(node: Expression): Expression[] {
  if (node.type === 'CallExpression') return node.arguments;

  return node.type === 'ArrayExpression'
    ? node.elements.filter((element) => element !== null)
    : templateParts(node);
}

const templateParts = (node: Expression): Expression[] =>
  node.type === 'TemplateLiteral' ? node.expressions : [];

// The class strings an expression can produce, however deep in branches and calls.
const classTexts = (node: Expression): string[] => [
  ...ownTexts(node),
  ...branches(node).flatMap(classTexts),
];

const containerTexts = (container: ESTree.JSXExpressionContainer): string[] =>
  container.expression.type === 'JSXEmptyExpression'
    ? []
    : classTexts(container.expression);

function valueTexts(
  value: NonNullable<ESTree.JSXAttribute['value']>,
): string[] {
  if (value.type === 'Literal') return literalText(value);

  return value.type === 'JSXExpressionContainer' ? containerTexts(value) : [];
}

const attributeTexts = (value: ESTree.JSXAttribute['value']): string[] =>
  value ? valueTexts(value) : [];

const spacingVisitor = (context: Context): SpacingVisitor => ({
  JSXAttribute: (node): void => {
    if (!isClassProp(node)) return;

    if (attributeTexts(node.value).some((text) => spacingClass.test(text)))
      context.report({ node, messageId: 'screenSpacing' });
  },
});

export const screenSpacing = defineRule({
  meta: {
    type: 'problem',
    messages: {
      screenSpacing:
        'A screen sets no padding, margin or gap; Screen, List and FieldGroup own its spacing. Add a scaffold prop in @repo/kit, or let a feature component own it.',
    },
  },
  create: spacingVisitor,
});
