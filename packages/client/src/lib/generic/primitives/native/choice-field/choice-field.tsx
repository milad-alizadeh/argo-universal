import { Column, Row, Spacer } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import type * as React from 'react';
import { Platform } from 'react-native';
import { NativeText } from '#primitives/display/native-text';
import { useInGroupedListItem } from '#primitives/lists/grouped-list-item';
import { Host, type HostProps } from '#primitives/native/host';

type FieldProps = {
  label: string;
  required?: boolean;
  variant?: 'field' | 'row';
} & {
  children: React.ReactElement;
};

// The column spans the field, so its label and value start at its edge, even inside a button.
const materialColumn = { spacing: 4, modifiers: [fillMaxWidth()] };

const fieldPadding = { paddingHorizontal: 16, paddingVertical: 12 };

export function ChoiceHost(props: {
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
export function ChoiceField(props: FieldProps): React.JSX.Element {
  const row = useInGroupedListItem() || props.variant === 'row';

  return row ? props.children : <LabelledField {...props} />;
}

// iOS sets a field's label beside its value, as Settings does; Material puts it above the field.
function LabelledField(props: FieldProps): React.JSX.Element {
  const label = <FieldLabel {...props} />;

  if (Platform.OS !== 'ios')
    return createElement(Column, materialColumn, label, props.children);

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
    <NativeText>{`${props.label}${props.required ? ' *' : ''}`}</NativeText>
  );
}
