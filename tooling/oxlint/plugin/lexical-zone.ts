import { defineRule, type Visitor } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const lexical = /^(?:lexical|@lexical\/[^/]+)(?:\/|$)/;

export const lexicalZone = defineRule({
  meta: {
    type: 'problem',
    messages: {
      lexicalZone:
        'Only the RichTextarea web drawing imports Lexical (ADR-0023); elsewhere, use the RichTextarea primitive.',
    },
  },
  create: (context): Visitor =>
    onModuleSources((source): void => {
      if (lexical.test(stringValue(source)))
        context.report({ node: source, messageId: 'lexicalZone' });
    }),
});
