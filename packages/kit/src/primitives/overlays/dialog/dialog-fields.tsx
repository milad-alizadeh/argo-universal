import {
  Children,
  isValidElement,
  type JSXElementConstructor,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { flattenedChildren } from '#kit/flattened-children';
import { FieldGroup } from '#primitives/fields/field-group';
import { PinnedActions } from './dialog-actions';
import type { DialogContentProps, DialogSheetProps } from './dialog-props';
import { DialogHeader, DialogTitle } from './dialog-text';

type Part = ReactElement<{ children?: ReactNode }>;

const isPart = (
  node: ReactNode,
  type: JSXElementConstructor<never>,
): node is Part => isValidElement(node) && node.type === type;

// A section is an element of the dialog's own children, as a FieldGroup reads its sections.
export function hasSections(children: ReactNode): boolean {
  return flattenedChildren(children).some((child) =>
    isPart(child, FieldGroup.Section),
  );
}

const plainText = (children: ReactNode): string =>
  Children.toArray(children)
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .join('');

// The text of a header's title or description, which a FieldGroup draws natively, as it cannot draw the React Native Text of DialogTitle.
function headingText(
  header: Part,
  type: JSXElementConstructor<never>,
): string | undefined {
  const text = flattenedChildren(header.props.children).find((child) =>
    isPart(child, type),
  );

  return isPart(text, type) ? plainText(text.props.children) : undefined;
}

function dialogTitle(children: ReactNode): string | undefined {
  const header = flattenedChildren(children).find((child) =>
    isPart(child, DialogHeader),
  );

  return isPart(header, DialogHeader)
    ? headingText(header, DialogTitle)
    : undefined;
}

// What a phone's sheet draws: the body, the footer pinned under it and the name the sheet announces.
type FieldsLayout = Pick<DialogSheetProps, 'children' | 'footer' | 'label'>;

type Parts = {
  header?: ReactNode;
  sections: ReactNode[];
  rest: ReactNode[];
};

function splitParts(children: ReactNode): Parts {
  const parts = flattenedChildren(children);
  const header = parts.find((part) => isPart(part, DialogHeader));
  const sections = parts.filter((part) => isPart(part, FieldGroup.Section));

  const named = new Set<ReactNode>([header, ...sections]);
  const rest = parts.filter((part) => !named.has(part));

  return { header, sections, rest };
}

/*
 * The sheet's body is the large heading over one FieldGroup of the caller's sections, which owns the scrolling and
 * the grouped insets. Everything else, a failure's message and the actions, is pinned under it in the sheet's
 * footer, in view at any height (ADR-0042: a form's buttons stay outside its FieldGroup).
 */
export function useFieldsLayout(props: DialogContentProps): FieldsLayout {
  const parts = splitParts(props.children);

  return {
    label: props.accessibilityLabel ?? dialogTitle(props.children),
    children: body(parts),
    footer: pinned(parts.rest),
  };
}

const body = (parts: Parts): ReactElement => (
  <>
    {headingBox(parts.header)}
    <FieldGroup>{parts.sections}</FieldGroup>
  </>
);

// The heading as a plain dialog draws it: Paper's iOS sheet pads every side, Android's drag handle zone sets the top.
const headingBox = (header: ReactNode): ReactNode =>
  header && <View className="px-4 pb-4 ios:pt-4">{header}</View>;

const pinned = (rest: ReactNode[]): ReactElement | undefined =>
  rest.length > 0 ? (
    <PinnedActions>
      <View className="gap-3 p-4">{rest}</View>
    </PinnedActions>
  ) : undefined;
