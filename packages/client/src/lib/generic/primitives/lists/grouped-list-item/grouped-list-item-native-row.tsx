import { Column, type RowProps, Row } from '@expo/ui';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { rowContentAccessibility } from './grouped-list-item-accessibility';
import { RowLabel, RowTrailing } from './grouped-list-item-native-fields';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { hasDisclosure } from './grouped-list-item-styles';
import { NativeRowLeading } from './native-row';

type Modifiers = NonNullable<RowProps['modifiers']>;

const ios = Platform.OS === 'ios';

// SwiftUI's row spacing; Material spaces a list item's slots by 16.
const rowSpacing = Platform.select({ ios: 12, default: 16 });

const reflowFontScale = 1.5;

const reflowSpacing = 8;

// A native row's icon, title and subtitle, value and status, and disclosure chevron.
export function RowContent(props: GroupedListItemProps): React.JSX.Element {
  const modifiers = useContentModifiers(props);

  return (
    <Row alignment="center" spacing={rowSpacing} modifiers={modifiers}>
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
  return [...rowContentAccessibility(props), ...(ios ? [] : [fillMaxWidth()])];
}

// Android values and large iOS text stack so neither can consume the label's width.
function RowFields(props: GroupedListItemProps): React.JSX.Element {
  const { fontScale } = useWindowDimensions();

  const stacked = reflows(fontScale, props);

  const fields = (
    <>
      <RowLabel {...props} stacked={stacked} />
      <RowTrailing {...props} />
    </>
  );

  return stacked ? <ReflowedFields>{fields}</ReflowedFields> : fields;
}

const reflows = (fontScale: number, props: GroupedListItemProps): boolean =>
  props.value !== undefined && (!ios || fontScale >= reflowFontScale);

function ReflowedFields({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Column spacing={reflowSpacing} modifiers={reflowModifiers}>
      {children}
    </Column>
  );
}

const reflowModifiers = ios
  ? [frame({ maxWidth: Infinity, alignment: 'leading' })]
  : [weight(1)];
