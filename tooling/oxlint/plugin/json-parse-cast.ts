import { type ESTree, defineRule } from '@oxlint/plugins';
import { isMember } from './syntax.ts';

const jsonParse = { object: 'JSON', property: 'parse' };

export const jsonParseCast = defineRule({
  meta: {
    type: 'problem',
    messages: {
      jsonParseCast:
        'Parse outside data with a Zod schema at the boundary; do not cast JSON.parse. Only packages/agents/<agent>/ narrows vendor types (ADR-0015, ADR-0016).',
    },
  },
  create: (
    context,
  ): { TSAsExpression: (node: ESTree.TSAsExpression) => void } => ({
    TSAsExpression: (node): void => {
      const value = node.expression;
      if (value.type === 'CallExpression' && isMember(value.callee, jsonParse))
        context.report({ node, messageId: 'jsonParseCast' });
    },
  }),
});
