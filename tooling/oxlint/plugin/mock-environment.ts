import type { ESTree } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';
import { isMember, stringValue } from './syntax.ts';

const processEnvironment = { object: 'process', property: 'env' };

const propertyName = (node: ESTree.MemberExpression): string =>
  node.property.type === 'Identifier'
    ? node.property.name
    : stringValue(node.property);

export const mockEnvironment = defineRule({
  meta: {
    type: 'problem',
    messages: {
      mockEnvironment:
        'Read mock CLI settings through readMockCliEnvironment() in mocks/cli/mock-cli.ts, not from process.env, so a misspelt knob fails its schema.',
    },
  },
  create: (
    context,
  ): { MemberExpression: (node: ESTree.MemberExpression) => void } => ({
    MemberExpression: (node): void => {
      const isEnvironment = isMember(node.object, processEnvironment);
      if (isEnvironment && propertyName(node).startsWith('MOCK_CLI_'))
        context.report({ node, messageId: 'mockEnvironment' });
    },
  }),
});
