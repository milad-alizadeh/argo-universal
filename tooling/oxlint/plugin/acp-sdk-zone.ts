import { defineRule, type Visitor } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const acpSdk = /^@agentclientprotocol\/sdk(?:\/|$)/;

export const acpSdkZone = defineRule({
  meta: {
    type: 'problem',
    messages: {
      acpSdkZone:
        'Only acp/ and the feed/acp and sessions/acp translators import the ACP SDK (Spec 0011); elsewhere, take the type from the translator that owns it.',
    },
  },
  create: (context): Visitor =>
    onModuleSources((source): void => {
      if (acpSdk.test(stringValue(source)))
        context.report({ node: source, messageId: 'acpSdkZone' });
    }),
});
