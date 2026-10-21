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

/*
 * A kit component reaches a file outside the kit as `@repo/kit/primitives/<group>/<name>`, the only
 * path the package publishes. The kit styles its own primitives (ADR-0020), so its internal imports
 * are not kit imports here.
 */
const isKitImport = (node: ESTree.ImportDeclaration): boolean =>
  node.importKind !== 'type' &&
  node.source.value.startsWith('@repo/kit/primitives/');

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
    if (!isKitImport(node)) return;

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
