import { defineRule } from '@oxlint/plugins';

export const databaseClient = defineRule({
  meta: {
    type: 'problem',
    messages: {
      databaseClient:
        'Only packages/db opens the SQLite database; take the client from @repo/db (ADR-0002, ADR-0005).',
    },
  },
  create: (context) => ({
    NewExpression: (node): void => {
      const { callee } = node;
      if (callee.type === 'Identifier' && callee.name === 'DatabaseSync')
        context.report({ node, messageId: 'databaseClient' });
    },
  }),
});
