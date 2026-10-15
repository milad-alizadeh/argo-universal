import { FieldGroup } from '@expo/ui';
import * as React from 'react';
import { Platform } from 'react-native';
import { FieldLayout } from '#primitives/fields/field-layout';
import { SearchField } from '#primitives/inputs/search-field';
import {
  GroupedListContent,
  type GroupedListContentProps,
  contentSection,
} from '#primitives/lists/grouped-list-content';
import {
  GroupedListSection,
  type GroupedListSectionProps,
  fieldSection,
} from '#primitives/lists/grouped-list-section';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListProps } from './grouped-list-props';
import { GroupedList as WebGroupedList } from './grouped-list.tsx';
import { useGroupedPage } from './grouped-page';

type Search = GroupedListProps['search'];

/*
 * The stock universal FieldGroup with no modifiers of ours: SwiftUI's Form on iOS, a Compose
 * column on Android, each drawing its own page, rows and separators.
 */
export function GroupedList(props: GroupedListProps): React.JSX.Element {
  const wide = useWide();

  useGroupedPage(!wide);

  if (wide) return <WebGroupedList {...props} />;

  return (
    <FieldLayout value="grouped">
      {dockedSearch(props.search)}
      <Host style={{ flex: 1 }} matchContents={false}>
        <FieldGroup>{fieldSections(props.children)}</FieldGroup>
      </Host>
    </FieldLayout>
  );
}

/*
 * Android's search, above the sections rather than among them: FieldGroup sets any child that is
 * not a Section in a card of its own (FieldGroup/groupChildren.tsx). iOS searches from its header.
 */
function dockedSearch(search: Search): React.JSX.Element | null {
  if (Platform.OS !== 'android' || !search) return null;

  // The kit's docked field, in the 16dp gutter FieldGroup gives its sections (@expo/ui 57 FieldGroup.android.tsx), as on Sessions.
  return <SearchField variant="docked" className="px-4 pt-4" {...search} />;
}

/*
 * FieldGroup knows a section only by its element type (@expo/ui 57 FieldGroup/groupChildren.tsx),
 * so each GroupedListSection and GroupedListContent child, through fragments, becomes the
 * FieldGroup.Section element itself.
 */
function fieldSections(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap<React.ReactNode>(
    fieldSectionOf,
  );
}

function fieldSectionOf(child: React.ReactNode): React.ReactNode[] {
  if (isFragment(child)) return fieldSections(child.props.children);

  return [sectionElement(child)];
}

function sectionElement(child: React.ReactNode): React.ReactNode {
  if (isSection(child)) return fieldSection(child.props, keyOf(child));

  return isContent(child) ? contentSection(child.props, keyOf(child)) : child;
}

const keyOf = (child: React.ReactElement): React.Key | undefined =>
  child.key ?? undefined;

const isFragment = (
  child: React.ReactNode,
): child is React.ReactElement<{ children?: React.ReactNode }> =>
  React.isValidElement(child) && child.type === React.Fragment;

const isSection = (
  child: React.ReactNode,
): child is React.ReactElement<GroupedListSectionProps> =>
  React.isValidElement(child) && child.type === GroupedListSection;

const isContent = (
  child: React.ReactNode,
): child is React.ReactElement<GroupedListContentProps> =>
  React.isValidElement(child) && child.type === GroupedListContent;

GroupedList satisfies React.ComponentType<GroupedListProps>;
