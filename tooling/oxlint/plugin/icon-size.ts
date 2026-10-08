import type { ESTree, Visitor } from '@oxlint/plugins';
import { defineRule } from '@oxlint/plugins';

type ValuedAttribute = ESTree.JSXAttribute & {
  value: NonNullable<ESTree.JSXAttribute['value']>;
};

const iconComponents = new Set(['Icon', 'IconSpinner', 'ComposerGlyph']);
const rawSizes = new Map([
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

const isRawSize = (name: string, text: string): boolean =>
  rawSizes.get(name)?.test(text) === true;

type IconVisitor = {
  JSXOpeningElement: NonNullable<Visitor['JSXOpeningElement']>;
};

export const iconSize = defineRule({
  meta: {
    type: 'problem',
    messages: {
      iconSize:
        'Icons take a named size: sm, md or lg. Remove numeric sizes and size-* classes.',
    },
  },
  create: (context): IconVisitor => {
    const hasRawSize = (attribute: ESTree.JSXAttributeItem): boolean =>
      isValuedAttribute(attribute) &&
      isRawSize(
        attributeName(attribute),
        context.sourceCode.getText(attribute.value),
      );
    return {
      JSXOpeningElement: (node): void => {
        if (isIcon(node) && node.attributes.some(hasRawSize))
          context.report({ node, messageId: 'iconSize' });
      },
    };
  },
});
