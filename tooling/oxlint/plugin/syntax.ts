import type { ESTree, Visitor } from '@oxlint/plugins';

type Node = ESTree.Node;
type ModuleSourceListener = (source: Node, statement: Node) => void;

const isStringLiteral = (node: Node): node is ESTree.StringLiteral =>
  node.type === 'Literal' && typeof node.value === 'string';

const isPlainTemplate = (node: Node): node is ESTree.TemplateLiteral =>
  node.type === 'TemplateLiteral' && node.expressions.length === 0;

const templateText = (node: ESTree.TemplateLiteral): string =>
  node.quasis.map((quasi): string | null => quasi.value.cooked).join('');

const staticText = (node: Node): string =>
  isPlainTemplate(node) ? templateText(node) : '';

// The text of a string literal or a template without expressions; empty for anything else.
export const stringValue = (node: Node | null | undefined): string => {
  if (!node) return '';
  return isStringLiteral(node) ? node.value : staticText(node);
};

const isIdentifier = (node: Node, name: string): boolean =>
  node.type === 'Identifier' && node.name === name;

export const isMember = (
  node: Node,
  path: { object: string; property: string },
): boolean =>
  node.type === 'MemberExpression' &&
  isIdentifier(node.object, path.object) &&
  isIdentifier(node.property, path.property);

const isRequire = (node: ESTree.CallExpression): boolean =>
  isIdentifier(node.callee, 'require');

// Calls listen for every import and export source, import() and require().
export const onModuleSources = (listen: ModuleSourceListener): Visitor => ({
  ImportDeclaration: (node): void => listen(node.source, node),
  ExportNamedDeclaration: (node): void => {
    if (node.source) listen(node.source, node);
  },
  ExportAllDeclaration: (node): void => listen(node.source, node),
  ImportExpression: (node): void => listen(node.source, node),
  TSImportType: (node): void => listen(node.source, node),
  CallExpression: (node): void => {
    const [source] = node.arguments;
    if (isRequire(node) && source) listen(source, node);
  },
});
