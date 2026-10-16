import { Column, type RowProps, Row } from '@expo/ui';
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
} from '@expo/ui/jetpack-compose/modifiers';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSidebarList } from '#primitives/fields/field-layout';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { rowDisclosureAccessibility } from './grouped-list-item-accessibility';
import { RowTrailing } from './grouped-list-item-native-fields';
import { RowHeadline } from './grouped-list-item-native-headline';
import type { ResolvedItemProps } from './grouped-list-item-props';
import { hasDisclosure } from './grouped-list-item-styles';
import { NativeRowStatus } from './native-row';

type Modifiers = NonNullable<RowProps['modifiers']>;

const ios = Platform.OS === 'ios';

const gutter = 16;

// SwiftUI spaces a row's parts itself; Material spaces a list item's slots by 16.
const rowSpacing = ios ? undefined : gutter;

const cardSpacing = 12;

const contentSpacing = (props: ResolvedItemProps): number | undefined =>
  props.variant === 'card' ? cardSpacing : rowSpacing;

const androidRowHeight = 56;

const androidRowPadding = 8;

const disabledOpacity = 0.5;

const reflowFontScale = 1.5;

const reflowSpacing = 8;

// Status and controls stay beside the chevron even when the label and value reflow.
export function RowContent(props: ResolvedItemProps): React.JSX.Element {
  const modifiers = useContentModifiers();

  return (
    <Row
      alignment={props.variant === 'card' ? 'start' : 'center'}
      spacing={contentSpacing(props)}
      style={{ opacity: props.disabled ? disabledOpacity : 1 }}
      modifiers={modifiers}
    >
      <RowFields {...props} />
      <NativeRowStatus {...props} />
      <Disclosure visible={hasDisclosure(props)} />
    </Row>
  );
}

function Disclosure({ visible }: { visible: boolean }): React.ReactNode {
  if (!visible) return null;

  return (
    <Row modifiers={rowDisclosureAccessibility()}>
      <NativeSymbol name="chevron-right" role={ios ? 'body' : 'row'} muted />
    </Row>
  );
}

// The Form sizes and pads an iOS row, and starts its separator under the Label's title.
function useContentModifiers(): Modifiers {
  const sidebar = useSidebarList();

  if (!ios) return [fillMaxWidth(), ...flatRowModifiers(sidebar)];

  return [];
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
function RowFields(props: ResolvedItemProps): React.JSX.Element {
  const { fontScale } = useWindowDimensions();

  const fields = (
    <>
      <RowHeadline {...props} />
      <RowTrailing {...props} />
    </>
  );

  return reflows(fontScale, props) ? (
    <ReflowedFields>{fields}</ReflowedFields>
  ) : (
    fields
  );
}

const reflows = (fontScale: number, props: ResolvedItemProps): boolean =>
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
