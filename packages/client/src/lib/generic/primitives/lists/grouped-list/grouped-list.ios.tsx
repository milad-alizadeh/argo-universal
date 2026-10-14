import { Form, List } from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  listStyle,
  scrollContentBackground,
  useScrollGeometryChange,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { FieldLayout } from '#primitives/fields/field-layout';
import { Host } from '#primitives/native/host';
import {
  type SheetList,
  useSheetList,
} from '#primitives/overlays/bottom-sheet';
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

// A sidebar list is a plain List, flat like the sidebar; any other is a grouped Form on the system grouped background.
function PhoneFields({
  variant,
  children,
}: GroupedListProps): React.JSX.Element {
  const sheetModifiers = useSheetModifiers();

  if (variant === 'sidebar')
    return (
      <List modifiers={[listStyle('plain'), scrollContentBackground('hidden')]}>
        {children}
      </List>
    );

  return <Form modifiers={sheetModifiers}>{children}</Form>;
}

/*
 * In a sheet the Form drops its grouped background, so the sheet's own surface shows behind the
 * groups, and tells the sheet how tall its rows are.
 */
function useSheetModifiers(): ModifierConfig[] {
  const sheet = useSheetList();
  const geometry = useScrollGeometryChange(geometryListener(sheet));

  if (!sheet) return [];

  return [scrollContentBackground('hidden'), ...(geometry ? [geometry] : [])];
}

function geometryListener(
  sheet: SheetList | undefined,
): Parameters<typeof useScrollGeometryChange>[0] {
  const onGeometry = sheet?.onGeometry;

  if (!onGeometry) return undefined;

  return ({ containerHeight, contentHeight }) =>
    onGeometry({ containerHeight, contentHeight });
}

GroupedList satisfies React.ComponentType<GroupedListProps>;
