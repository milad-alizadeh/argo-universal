import type { ESTree } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const apiPackage = /^@repo\/api(?:\/|$)/;

const isTypeOnly = (statement: ESTree.Node): boolean =>
  'importKind' in statement
    ? statement.importKind === 'type'
    : 'exportKind' in statement && statement.exportKind === 'type';

export const apiTypeOnly = defineRule({
  meta: {
    type: 'problem',
    messages: {
      apiTypeOnly:
        'client imports @repo/api only with `import type`; move runtime data to @repo/contracts, or keep it in a test, story or mock.',
    },
  },
  create: (context): import('@oxlint/plugins').Visitor =>
    onModuleSources((source, statement): void => {
      const isApi = apiPackage.test(stringValue(source));
      if (isApi && !isTypeOnly(statement))
        context.report({ node: source, messageId: 'apiTypeOnly' });
    }),
});
