import { Column, Row, Spacer, Text } from '@expo/ui';
import { createElement } from 'react';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useInGroupedListItem } from '#primitives/lists/grouped-list-item';
import { Host, type HostProps } from '#primitives/native/host';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import type { PickerProps } from './picker-props';
import { pickerLabel } from './picker-selection';

type FieldProps = Pick<
  PickerProps<string>,
  'label' | 'required' | 'variant'
> & {
  children: React.ReactElement;
};

const fieldPadding = { paddingHorizontal: 16, paddingVertical: 12 };

export function PickerNativeHost(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <Host {...useHostSize()}>{props.children}</Host>;
}

// A row's trailing slot has no width to fill, so there the Picker takes its own; elsewhere it spans the field.
function useHostSize(): Pick<HostProps, 'matchContents' | 'style'> {
  if (useInGroupedListItem()) return { matchContents: true };

  return { matchContents: { vertical: true }, style: { width: '100%' } };
}

// In a row the GroupedListItem names the Picker, so only a field draws its own label.
export function PickerNativeField(props: FieldProps): React.JSX.Element {
  const row = useInGroupedListItem() || props.variant === 'row';

  return row ? props.children : <LabelledField {...props} />;
}

// iOS sets a field's label beside its value, as Settings does; Material puts it above the field.
function LabelledField(props: FieldProps): React.JSX.Element {
  const label = <FieldLabel {...props} />;

  if (Platform.OS !== 'ios')
    return createElement(Column, { spacing: 4 }, label, props.children);

  return createElement(
    Row,
    { alignment: 'center', style: fieldPadding },
    label,
    <Spacer />,
    props.children,
  );
}

function FieldLabel(
  props: Pick<FieldProps, 'label' | 'required'>,
): React.JSX.Element {
  return (
    <Text textStyle={useUniversalTextStyle('body')}>{pickerLabel(props)}</Text>
  );
}
