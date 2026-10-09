import type { ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';
import { onModuleSources, stringValue } from './syntax.ts';

const apiPackage = /^@repo\/api(?:\/|$)/;
const serverPackage = /^@repo\/server(?:\/|$)/;
const enginePackage = /^@repo\/engine(?:\/|$)/;

const isTypeOnlyDeclaration = (statement: ESTree.Node): boolean =>
  'importKind' in statement
    ? statement.importKind === 'type'
    : 'exportKind' in statement && statement.exportKind === 'type';

const isTypeOnly = (statement: ESTree.Node): boolean =>
  statement.type === 'TSImportType' || isTypeOnlyDeclaration(statement);

const isAppRouterName = (node: ESTree.Node): boolean =>
  node.type === 'Identifier' && node.name === 'AppRouter';

const isAppRouterSpecifier = (
  specifier:
    | ESTree.ImportDeclaration['specifiers'][number]
    | ESTree.ExportSpecifier,
): boolean => {
  if (specifier.type === 'ImportSpecifier')
    return isAppRouterName(specifier.imported);
  if (specifier.type === 'ExportSpecifier')
    return isAppRouterName(specifier.local);
  return false;
};

const namesOnlyAppRouter = (statement: ESTree.Node): boolean => {
  if (
    statement.type !== 'ImportDeclaration' &&
    statement.type !== 'ExportNamedDeclaration'
  )
    return false;
  return statement.specifiers.every(isAppRouterSpecifier);
};

const isPublicRouterType = (source: string, statement: ESTree.Node): boolean =>
  source === '@repo/engine/router' &&
  isTypeOnly(statement) &&
  namesOnlyAppRouter(statement);

const isForbiddenServerImport = (
  source: string,
  statement: ESTree.Node,
): boolean =>
  serverPackage.test(source) ||
  (enginePackage.test(source) && !isPublicRouterType(source, statement));

const isForbiddenImport = (source: string, statement: ESTree.Node): boolean =>
  (apiPackage.test(source) && !isTypeOnly(statement)) ||
  isForbiddenServerImport(source, statement);

export const apiTypeOnly = defineRule({
  meta: {
    type: 'problem',
    messages: {
      apiTypeOnly:
        'The App imports only AppRouter from @repo/engine/router with `import type`; Engine runtime stays outside App bundles (ADR-0016). @repo/api runtime belongs in tests, stories or mocks.',
    },
  },
  create: (context): Visitor =>
    onModuleSources((source, statement): void => {
      if (isForbiddenImport(stringValue(source), statement))
        context.report({ node: source, messageId: 'apiTypeOnly' });
    }),
});
