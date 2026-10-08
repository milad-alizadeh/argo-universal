import {
  type Context,
  type ESTree,
  type Visitor,
  defineRule,
} from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const isContractsColumns = (filename: string): boolean =>
  filename.replaceAll('\\', '/').endsWith('/packages/contracts/src/columns.ts');

const rejectSchemaSource = (context: Context, source: ESTree.Node): void => {
  if (stringValue(source) === 'drizzle-orm/zod')
    context.report({ node: source, messageId: 'drizzleSchemaBoundary' });
};

const schemaSourceListeners = (context: Context): Visitor => ({
  ...onModuleSources((source): void => rejectSchemaSource(context, source)),
  TSImportType: (node): void => rejectSchemaSource(context, node.source),
  TSExternalModuleReference: (node): void =>
    rejectSchemaSource(context, node.expression),
});

export const drizzleSchemaBoundary = defineRule({
  meta: {
    type: 'problem',
    messages: {
      drizzleSchemaBoundary:
        'Derive table schemas only in packages/contracts/src/columns.ts; use the published contracts schema elsewhere (ADR-0013).',
    },
  },
  create: (context): Visitor =>
    isContractsColumns(context.filename) ? {} : schemaSourceListeners(context),
});
