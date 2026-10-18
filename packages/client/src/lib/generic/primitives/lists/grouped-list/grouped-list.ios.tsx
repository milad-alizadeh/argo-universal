// Split from Android: SwiftUI's Form scrolls the sections here, while Android scrolls them in React Native for its sheets.
import { FieldGroup } from '@expo/ui';
import { List } from '@expo/ui/swift-ui';
import {
  listStyle,
  listSectionSpacing,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { FieldLayout } from '#primitives/fields/field-layout';
import { Host } from '#primitives/native/host';
import { useNativeTheme } from '../../../native-theme';
import type { GroupedListProps } from './grouped-list-props';
import { compactGroupedListGap } from './grouped-list-spacing';

// SwiftUI draws the list at every size class: the window's width moves the panes, not the drawing.
export function GroupedList(props: GroupedListProps): React.JSX.Element {
  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <Host style={{ flex: 1 }} matchContents={false}>
        <PhoneFields {...props} />
      </Host>
    </FieldLayout>
  );
}

/*
 * A sidebar list is a plain List, flat like the sidebar; any other is a grouped FieldGroup.
 * The universal List takes no modifiers, so the plain, backgroundless sidebar List stays SwiftUI's.
 */
function PhoneFields({
  variant,
  children,
  gap,
}: GroupedListProps): React.JSX.Element {
  return variant === 'sidebar' ? (
    <SidebarFields>{children}</SidebarFields>
  ) : (
    <GroupedFields gap={gap}>{children}</GroupedFields>
  );
}

function SidebarFields({
  children,
}: Pick<GroupedListProps, 'children'>): React.JSX.Element {
  return (
    <List modifiers={[listStyle('plain'), scrollContentBackground('hidden')]}>
      {children}
    </List>
  );
}

function GroupedFields({
  children,
  gap,
}: Pick<GroupedListProps, 'children' | 'gap'>): React.JSX.Element {
  const { content } = useNativeTheme().colors;

  return (
    <FieldGroup
      style={{ backgroundColor: content }}
      modifiers={[scrollContentBackground('hidden'), sectionSpacing(gap)]}
    >
      {children}
    </FieldGroup>
  );
}

GroupedList satisfies React.ComponentType<GroupedListProps>;

const sectionSpacing = (
  gap: GroupedListProps['gap'],
): ReturnType<typeof listSectionSpacing> =>
  listSectionSpacing(gap === 'sm' ? compactGroupedListGap : 'default');
