import { type Visitor, defineRule } from '@oxlint/plugins';

// Array methods the app's Hermes does not have; calling one throws "undefined is not a function" on the device.
const missingMethods = new Set<unknown>(['toSorted']);

type HermesVisitor = {
  MemberExpression: NonNullable<Visitor['MemberExpression']>;
};

export const hermesArrayMethods = defineRule({
  meta: {
    type: 'problem',
    messages: {
      hermesArrayMethods:
        'Hermes has no Array.prototype.toSorted; sort a copy instead: [...items].sort(compare).',
    },
  },
  create: (context): HermesVisitor => ({
    MemberExpression: (node): void => {
      const { property } = node;

      if (property.type === 'Identifier' && missingMethods.has(property.name))
        context.report({ node, messageId: 'hermesArrayMethods' });
    },
  }),
});
