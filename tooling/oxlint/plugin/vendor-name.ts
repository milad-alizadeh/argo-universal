import { type Visitor, defineRule } from '@oxlint/plugins';

const vendorNames = new Set<unknown>([
  'claude',
  'codex',
  'claude-acp',
  'codex-acp',
]);

type VendorNameVisitor = { Literal: NonNullable<Visitor['Literal']> };

export const vendorName = defineRule({
  meta: {
    type: 'problem',
    messages: {
      vendorName:
        'A vendor name appears only inside the vendor module (ADR-0004). Branch on negotiated ACP capabilities.',
    },
  },
  create: (context): VendorNameVisitor => ({
    Literal: (node): void => {
      if (vendorNames.has(node.value))
        context.report({ node, messageId: 'vendorName' });
    },
  }),
});
