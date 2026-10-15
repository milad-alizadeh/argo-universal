import { Column, type RowProps, Row } from '@expo/ui';
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
} from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityHidden,
  alignmentGuide,
  frame,
  padding as swiftPadding,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSidebarList } from '#primitives/fields/field-layout';
import { useIconPixels } from '../../../symbols/icon-role';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { RowLabel, RowTrailing } from './grouped-list-item-native-fields';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { hasDisclosure, hasLeadingSlot } from './grouped-list-item-styles';
import { NativeRowLeading } from './native-row';

type Modifiers = NonNullable<RowProps['modifiers']>;

const ios = Platform.OS === 'ios';

// SwiftUI's row spacing; Material spaces a list item's slots by 16.
const rowSpacing = Platform.select({ ios: 12, default: 16 });

const iosRowHeight = 44;

const iosRowPadding = 12;

const androidRowHeight = 56;

const gutter = 16;

const androidRowPadding = 8;

const disabledOpacity = 0.5;

const reflowFontScale = 1.5;

const reflowSpacing = 8;

// A native row's icon, title and subtitle, value and status, and disclosure chevron.
export function RowContent(props: GroupedListItemProps): React.JSX.Element {
  const modifiers = useContentModifiers(props);

  return (
    <Row
      alignment="center"
      spacing={rowSpacing}
      style={{ opacity: props.disabled ? disabledOpacity : 1 }}
      modifiers={modifiers}
    >
      <NativeRowLeading {...props} />
      <RowFields {...props} />
      <Disclosure visible={hasDisclosure(props)} />
    </Row>
  );
}

function Disclosure({ visible }: { visible: boolean }): React.ReactNode {
  if (!visible) return null;

  return (
    <NativeSymbol name="chevron-right" role={ios ? 'body' : 'row'} muted />
  );
}

function useContentModifiers(props: GroupedListItemProps): Modifiers {
  const iconSize = useIconPixels('row');
  const sidebar = useSidebarList();

  if (!ios) return [fillMaxWidth(), ...flatRowModifiers(sidebar)];

  return [
    swiftPadding({ vertical: iosRowPadding }),
    accessibilityHidden(!!props.detail),
    frame({ minHeight: iosRowHeight }),
    separatorInset(props, iconSize),
  ];
}

// The separator starts under the title, past the icon slot.
function separatorInset(
  props: GroupedListItemProps,
  iconSize: number,
): ReturnType<typeof alignmentGuide> {
  const inset = hasLeadingSlot(props) ? iconSize + rowSpacing : 0;

  return alignmentGuide('listRowSeparatorLeading', inset);
}

// Android's Section pads its rows on Material's tile; a flat sidebar row pads itself.
function flatRowModifiers(sidebar: boolean): Modifiers {
  if (!sidebar) return [];

  return [
    defaultMinSize({ minHeight: androidRowHeight }),
    padding(gutter, androidRowPadding, gutter, androidRowPadding),
  ];
}

// At a large system text size, the value wraps under the title on iOS.
function RowFields(props: GroupedListItemProps): React.JSX.Element {
  const { fontScale } = useWindowDimensions();

  const fields = (
    <>
      <RowLabel {...props} />
      <RowTrailing {...props} />
    </>
  );

  return reflows(fontScale, props) ? (
    <ReflowedFields>{fields}</ReflowedFields>
  ) : (
    fields
  );
}

const reflows = (fontScale: number, props: GroupedListItemProps): boolean =>
  ios && fontScale >= reflowFontScale && props.value !== undefined;

function ReflowedFields({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Column
      spacing={reflowSpacing}
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
    >
      {children}
    </Column>
  );
}
