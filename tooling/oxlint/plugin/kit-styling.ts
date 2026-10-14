import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type KitVisitor = {
  ImportDeclaration: NonNullable<Visitor['ImportDeclaration']>;
  JSXOpeningElement: NonNullable<Visitor['JSXOpeningElement']>;
};

type Specifier = ESTree.ImportDeclaration['specifiers'][number];

const styleProps = new Set(['className', 'style']);

// Every kit component is imported from the primitives folder through its alias.
const isKitImport = (node: ESTree.ImportDeclaration): boolean =>
  node.importKind !== 'type' && node.source.value.startsWith('#primitives/');

const isValueSpecifier = (specifier: Specifier): boolean =>
  specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type';

// The local name a JSX tag starts with: `Button`, or `Menu` in `Menu.Item`.
const rootName = (name: ESTree.JSXOpeningElement['name']): string => {
  if (name.type === 'JSXIdentifier') return name.name;

  return name.type === 'JSXMemberExpression' ? rootName(name.object) : '';
};

const isStyleProp = (attribute: ESTree.JSXAttributeItem): boolean =>
  attribute.type === 'JSXAttribute' &&
  attribute.name.type === 'JSXIdentifier' &&
  styleProps.has(attribute.name.name);

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
        'Kit components take props, not className or style; style them inside lib/generic.',
    },
  },
  create: (context): KitVisitor => kitVisitor(context, new Set()),
});
