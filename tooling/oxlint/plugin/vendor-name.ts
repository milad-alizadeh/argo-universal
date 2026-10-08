import { defineRule } from '@oxlint/plugins';

const vendorNames = new Set<unknown>(['claude', 'codex']);

export const vendorName = defineRule({
  meta: {
    type: 'problem',
    messages: {
      vendorName:
        'A vendor name appears only inside packages/agents/<agent>/ and mocks/cli/<agent>/ (ADR-0004). Branch on a capability the adapter registers.',
    },
  },
  create: (context) => ({
    Literal: (node): void => {
      if (vendorNames.has(node.value))
        context.report({ node, messageId: 'vendorName' });
    },
  }),
});
