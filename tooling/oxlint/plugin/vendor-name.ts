import { type Visitor, defineRule } from '@oxlint/plugins';

const vendorNames = new Set<unknown>(['claude', 'codex']);

type VendorNameVisitor = { Literal: NonNullable<Visitor['Literal']> };

export const vendorName = defineRule({
  meta: {
    type: 'problem',
    messages: {
      vendorName:
        'A vendor name appears only inside packages/agents/<agent>/ (ADR-0004). Branch on a capability the adapter registers.',
    },
  },
  create: (context): VendorNameVisitor => ({
    Literal: (node): void => {
      if (vendorNames.has(node.value))
        context.report({ node, messageId: 'vendorName' });
    },
  }),
});
