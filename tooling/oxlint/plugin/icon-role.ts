import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type ValuedAttribute = ESTree.JSXAttribute & {
  value: NonNullable<ESTree.JSXAttribute['value']>;
};

const iconComponents = new Set(['Icon', 'IconSpinner', 'IconSlot']);
const pixelSizes = new Map([
  ['size', /./],
  ['className', /(?:^|[^-\w])size-/],
]);

const isIcon = (node: ESTree.JSXOpeningElement): boolean =>
  node.name.type === 'JSXIdentifier' && iconComponents.has(node.name.name);

const isValuedAttribute = (
  attribute: ESTree.JSXAttributeItem,
): attribute is ValuedAttribute =>
  attribute.type === 'JSXAttribute' && attribute.value !== null;

const attributeName = (attribute: ESTree.JSXAttribute): string =>
  attribute.name.type === 'JSXIdentifier' ? attribute.name.name : '';

const isPixelSize = (name: string, text: string): boolean =>
  pixelSizes.get(name)?.test(text) === true;

const isNumber = (node: ESTree.Argument): boolean =>
  node.type === 'Literal' && typeof node.value === 'number';

// `size(16, 16)`, the Compose modifier, drawn with a hand-typed number.
const isPixelModifier = (node: ESTree.CallExpression): boolean =>
  node.callee.type === 'Identifier' &&
  node.callee.name === 'size' &&
  node.arguments.some(isNumber);

// SwiftUI's Image, which takes a pixel size; NativeSymbol wraps it with a role.
const isSwiftUIImage = (node: ESTree.ImportDeclaration): boolean =>
  node.source.value === '@expo/ui/swift-ui' &&
  node.specifiers.some(
    (specifier) =>
      specifier.type === 'ImportSpecifier' &&
      specifier.imported.type === 'Identifier' &&
      specifier.imported.name === 'Image',
  );

type IconVisitor = {
  JSXOpeningElement: NonNullable<Visitor['JSXOpeningElement']>;
  JSXAttribute: NonNullable<Visitor['JSXAttribute']>;
  CallExpression: NonNullable<Visitor['CallExpression']>;
  ImportDeclaration: NonNullable<Visitor['ImportDeclaration']>;
};

const hasPixelSize =
  (context: Context) =>
  (attribute: ESTree.JSXAttributeItem): boolean =>
    isValuedAttribute(attribute) &&
    isPixelSize(
      attributeName(attribute),
      context.sourceCode.getText(attribute.value),
    );

const isSystemName = (node: ESTree.JSXAttribute): boolean =>
  attributeName(node) === 'systemName';

const reportNativeSymbol =
  <Node extends ESTree.Node>(context: Context, test: (node: Node) => boolean) =>
  (node: Node): void => {
    if (test(node)) context.report({ node, messageId: 'nativeSymbol' });
  };

const nativeSymbolChecks = (
  context: Context,
): Omit<IconVisitor, 'JSXOpeningElement'> => ({
  JSXAttribute: reportNativeSymbol(context, isSystemName),
  CallExpression: reportNativeSymbol(context, isPixelModifier),
  ImportDeclaration: reportNativeSymbol(context, isSwiftUIImage),
});

export const iconRole = defineRule({
  meta: {
    type: 'problem',
    messages: {
      iconRole:
        'Icons take a role (body, secondary, control, mark, row, action, nav, title), never a size prop or size-* class.',
      nativeSymbol:
        'Draw a native symbol with NativeSymbol, or size it with useIconPixels(role), so native icons follow the same roles.',
    },
  },
  create: (context): IconVisitor => ({
    JSXOpeningElement: (node): void => {
      if (isIcon(node) && node.attributes.some(hasPixelSize(context)))
        context.report({ node, messageId: 'iconRole' });
    },
    ...nativeSymbolChecks(context),
  }),
});
