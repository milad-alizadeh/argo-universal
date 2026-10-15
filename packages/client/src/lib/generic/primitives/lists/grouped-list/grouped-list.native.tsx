import { FieldGroup } from '@expo/ui';
import type * as React from 'react';
import { Platform } from 'react-native';
import { FieldLayout } from '#primitives/fields/field-layout';
import { DockedSearchFieldContent } from '#primitives/inputs/search-field';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListProps } from './grouped-list-props';
import { GroupedList as WebGroupedList } from './grouped-list.tsx';

// The stock universal FieldGroup with no modifiers of ours: each platform draws its own page, rows and separators.
export function GroupedList(props: GroupedListProps): React.JSX.Element {
  const wide = useWide();

  if (wide) return <WebGroupedList {...props} />;

  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <Host style={{ flex: 1 }} matchContents={false}>
        <FieldGroup>
          {Platform.OS === 'android' && props.search && (
            <DockedSearchFieldContent {...props.search} />
          )}
          {props.children}
        </FieldGroup>
      </Host>
    </FieldLayout>
  );
}

GroupedList satisfies React.ComponentType<GroupedListProps>;
