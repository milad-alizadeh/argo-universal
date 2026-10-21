import { dirname, resolve } from 'node:path';
import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type KitVisitor = {
  ImportDeclaration: NonNullable<Visitor['ImportDeclaration']>;
  JSXOpeningElement: NonNullable<Visitor['JSXOpeningElement']>;
};

type Specifier = ESTree.ImportDeclaration['specifiers'][number];

// `className`, `style`, and any slot class such as `iconClassName` or `contentClassName`.
const isStylePropName = (name: string): boolean =>
  name === 'style' || name === 'className' || name.endsWith('ClassName');

// A relative path that lands in the primitives folder, such as `../button` inside the kit.
const isRelativeKitPath = (source: string, filename: string): boolean =>
  source.startsWith('.') &&
  resolve(dirname(filename), source)
    .replaceAll('\\', '/')
    .includes('/kit/src/primitives/');

// The primitives folder, named through @repo/kit or the kit's own alias.
const primitivesPrefixes = ['@repo/kit/primitives/', '#primitives/'];

const namesPrimitives = (source: string, filename: string): boolean =>
  primitivesPrefixes.some((prefix): boolean => source.startsWith(prefix)) ||
  isRelativeKitPath(source, filename);

// Kit components come from the primitives folder: through @repo/kit, the kit's own alias, or a relative path.
const isKitImport = (
  node: ESTree.ImportDeclaration,
  filename: string,
): boolean =>
  node.importKind !== 'type' && namesPrimitives(node.source.value, filename);

const isValueSpecifier = (specifier: Specifier): boolean =>
  specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type';

// The local name a JSX tag starts with: `Button`, or `Menu` in `Menu.Item`.
const rootName = (name: ESTree.JSXOpeningElement['name']): string => {
  if (name.type === 'JSXIdentifier') return name.name;

  return name.type === 'JSXMemberExpression' ? rootName(name.object) : '';
};

const literalName = (key: ESTree.PropertyKey): string =>
  key.type === 'Literal' ? String(key.value) : '';

const keyName = (key: ESTree.PropertyKey): string =>
  key.type === 'Identifier' ? key.name : literalName(key);

// A computed key is skipped: `{ [name]: value }` names no prop the rule can read.
const isStyleProperty = (
  property: ESTree.ObjectExpression['properties'][number],
): boolean =>
  property.type === 'Property' &&
  !property.computed &&
  isStylePropName(keyName(property.key));

// A spread is checked only when it is an object literal: `{...{ className: 'x' }}`.
const spreadsStyle = (attribute: ESTree.JSXSpreadAttribute): boolean =>
  attribute.argument.type === 'ObjectExpression' &&
  attribute.argument.properties.some(isStyleProperty);

const isStyleProp = (attribute: ESTree.JSXAttributeItem): boolean => {
  if (attribute.type === 'JSXSpreadAttribute') return spreadsStyle(attribute);

  return (
    attribute.name.type === 'JSXIdentifier' &&
    isStylePropName(attribute.name.name)
  );
};

const kitVisitor = (context: Context, kitNames: Set<string>): KitVisitor => ({
  ImportDeclaration: (node): void => {
    if (!isKitImport(node, context.filename)) return;

    for (const specifier of node.specifiers.filter(isValueSpecifier))
      kitNames.add(specifier.local.name);
  },
  JSXOpeningElement: (node): void => {
    if (!kitNames.has(rootName(node.name))) return;

    for (const attribute of node.attributes.filter(isStyleProp))
      context.report({ node: attribute, messageId: 'kitStyling' });
  },
});

export const kitStyling = defineRule({
  meta: {
    type: 'problem',
    messages: {
      kitStyling:
        'Kit components take props, not className, style or a *ClassName slot; style them inside @repo/kit.',
    },
  },
  create: (context): KitVisitor => kitVisitor(context, new Set()),
});
