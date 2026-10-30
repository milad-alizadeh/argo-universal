import type { Context, ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type ValuedAttribute = ESTree.JSXAttribute & {
  value: NonNullable<ESTree.JSXAttribute['value']>;
};

const iconComponents = new Set(['Icon', 'IconSpinner', 'IconSlot']);

const pixelSizes = new Map([
  ['size', /^\{\s*\d/],
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

// SwiftUI's Image, which takes a pixel size; NativeSymbol wraps it with a size.
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
  Property: NonNullable<Visitor['Property']>;
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

/*
 * A SwiftUI Image or Label named by hand: `systemName` as an attribute, and `systemImage` wherever a Label's icon is
 * handed over, including as an object property. Both draw at the surrounding font's size in the platform's tint,
 * which is how a Settings row's glyph turned up accent blue (#1452); NativeSymbol gives it a role size and a token.
 */
const nativeSymbolNames = new Set(['systemName', 'systemImage']);

const isSystemName = (node: ESTree.JSXAttribute): boolean =>
  nativeSymbolNames.has(attributeName(node));

type KeyedProperty = { key: { type: string; name?: string } };

const isSystemImageProperty = (node: KeyedProperty): boolean =>
  node.key.type === 'Identifier' && nativeSymbolNames.has(node.key.name ?? '');

const reportNativeSymbol =
  <Node extends ESTree.Node>(context: Context, test: (node: Node) => boolean) =>
  (node: Node): void => {
    if (test(node)) context.report({ node, messageId: 'nativeSymbol' });
  };

const nativeSymbolChecks = (
  context: Context,
): Omit<IconVisitor, 'JSXOpeningElement'> => ({
  JSXAttribute: reportNativeSymbol(context, isSystemName),
  Property: reportNativeSymbol(context, isSystemImageProperty),
  CallExpression: reportNativeSymbol(context, isPixelModifier),
  ImportDeclaration: reportNativeSymbol(context, isSwiftUIImage),
});

export const iconSize = defineRule({
  meta: {
    type: 'problem',
    messages: {
      iconSize:
        'Icons take a size (xs, sm, md, lg), never a pixel number or a size-* class.',
      nativeSymbol:
        'Draw a native symbol with NativeSymbol, or size it with useIconPixels(size), so native icons follow the same sizes and take the kit’s glyph token rather than the platform’s tint.',
    },
  },
  create: (context): IconVisitor => ({
    JSXOpeningElement: (node): void => {
      if (isIcon(node) && node.attributes.some(hasPixelSize(context)))
        context.report({ node, messageId: 'iconSize' });
    },
    ...nativeSymbolChecks(context),
  }),
});
