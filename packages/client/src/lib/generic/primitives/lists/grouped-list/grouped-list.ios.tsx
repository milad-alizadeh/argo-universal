// Split from Android: SwiftUI's Form scrolls the sections here, while Android scrolls them in React Native for its sheets.
import { FieldGroup } from '@expo/ui';
import { List } from '@expo/ui/swift-ui';
import {
  listStyle,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { FieldLayout } from '#primitives/fields/field-layout';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListProps } from './grouped-list-props';
import { GroupedList as WebGroupedList } from './grouped-list.tsx';

export function GroupedList(props: GroupedListProps): React.JSX.Element {
  const wide = useWide();

  if (wide) return <WebGroupedList {...props} />;

  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <Host style={{ flex: 1 }} matchContents={false}>
        <PhoneFields variant={props.variant}>{props.children}</PhoneFields>
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
}: GroupedListProps): React.JSX.Element {
  if (variant === 'sidebar')
    return (
      <List modifiers={[listStyle('plain'), scrollContentBackground('hidden')]}>
        {children}
      </List>
    );

  return <FieldGroup>{children}</FieldGroup>;
}

GroupedList satisfies React.ComponentType<GroupedListProps>;
