import { Column, type RowProps, Row } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityHidden, frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { RowLabel, RowTrailing } from './grouped-list-item-native-fields';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { hasDisclosure } from './grouped-list-item-styles';
import { NativeRowLeading } from './native-row';

type Modifiers = NonNullable<RowProps['modifiers']>;

const ios = Platform.OS === 'ios';

// SwiftUI's row spacing; Material spaces a list item's slots by 16.
const rowSpacing = Platform.select({ ios: 12, default: 16 });

const disabledOpacity = 0.5;

const reflowFontScale = 1.5;

const reflowSpacing = 8;

// A native row's icon, title and subtitle, value and status, and disclosure chevron.
export function RowContent(props: GroupedListItemProps): React.JSX.Element {
  const modifiers = contentModifiers(props);

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

// Android's Section pads its rows on Material's tile.
function contentModifiers(props: GroupedListItemProps): Modifiers {
  if (!ios) return [fillMaxWidth()];

  return [accessibilityHidden(!!props.detail)];
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
