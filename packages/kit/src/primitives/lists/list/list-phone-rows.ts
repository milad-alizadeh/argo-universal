import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ListProps, ListSectionProps } from './list-props';

// The element types a phone's native list can host: its Sections and the rows it draws as SwiftUI or Compose views.
export type NativeKinds = {
  section: ReactElement['type'];
  rows: ReadonlySet<unknown>;
};

// A Section's props the native list draws. Any other (actions, subtitle, leading, ...) sends the List to LegendList.
const drawnSectionProps: ReadonlySet<string> = new Set([
  'title',
  'footer',
  'children',
]);

const isUndrawn = ([name, value]: [string, unknown]): boolean =>
  value !== undefined && !drawnSectionProps.has(name);

const isRow = (child: ReactNode, kinds: NativeKinds): boolean =>
  isValidElement(child) && kinds.rows.has(child.type);

const isSection = (
  child: ReactNode,
  kinds: NativeKinds,
): child is ReactElement<ListSectionProps> =>
  isValidElement(child) && child.type === kinds.section;

const onlyRows = (children: ReactNode, kinds: NativeKinds): boolean =>
  flattenedChildren(children).every((child) => isRow(child, kinds));

const isPlainSection = (
  section: ReactElement<ListSectionProps>,
  kinds: NativeKinds,
): boolean =>
  !Object.entries(section.props).some(isUndrawn) &&
  onlyRows(section.props.children, kinds);

const isNativeChild = (child: ReactNode, kinds: NativeKinds): boolean =>
  isSection(child, kinds) ? isPlainSection(child, kinds) : isRow(child, kinds);

type Hosted<Item> = Pick<
  ListProps<Item>,
  'items' | 'header' | 'endContent' | 'children'
>;

const isFixedChildren = <Item>(props: Hosted<Item>): boolean =>
  props.items === undefined &&
  props.header === undefined &&
  props.endContent === undefined;

/*
 * A grouped List is native on a phone only when SwiftUI and Compose can host everything in it (ADR-0042): fixed
 * children that are all FieldGroup rows, in plain Sections. A data List's rows are made later by its `renderItem`,
 * and a ListItem or any other React Native content cannot sit in a native list, so those draw on LegendList.
 */
export const hostsNatively = <Item>(
  props: Hosted<Item>,
  kinds: NativeKinds,
): boolean =>
  isFixedChildren(props) &&
  flattenedChildren(props.children).every((child) =>
    isNativeChild(child, kinds),
  );
