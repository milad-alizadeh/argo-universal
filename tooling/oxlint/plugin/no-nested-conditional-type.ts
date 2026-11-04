import { defineRule, type ESTree, type Visitor } from '@oxlint/plugins';

// A branch through any parentheses around it.
const unwrapped = (node: ESTree.TSType): ESTree.TSType =>
  node.type === 'TSParenthesizedType' ? unwrapped(node.typeAnnotation) : node;

const isConditional = (node: ESTree.TSType): boolean =>
  unwrapped(node).type === 'TSConditionalType';

export const noNestedConditionalType = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      noNestedConditionalType:
        'Do not nest a conditional type in another one’s branch, as no-nested-ternary forbids for values. Name the inner type, spell out the props, or use one mapped type.',
    },
  },
  create: (context): Visitor => ({
    TSConditionalType: (node): void => {
      for (const branch of [node.trueType, node.falseType])
        if (isConditional(branch))
          context.report({
            node: unwrapped(branch),
            messageId: 'noNestedConditionalType',
          });
    },
  }),
});
