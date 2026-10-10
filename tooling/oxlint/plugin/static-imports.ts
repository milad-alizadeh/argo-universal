import { defineRule } from '@oxlint/plugins';
import type { Visitor } from '@oxlint/plugins';

export const staticImports = defineRule({
  meta: {
    type: 'problem',
    messages: {
      staticImports:
        'Use a top-level static import or import type declaration.',
    },
  },
  create: (context): Visitor => ({
    ImportExpression: (node): void =>
      context.report({ node, messageId: 'staticImports' }),
    TSImportType: (node): void =>
      context.report({ node, messageId: 'staticImports' }),
  }),
});
