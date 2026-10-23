import { Column, Row, Spacer } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import type * as React from 'react';
import { Platform } from 'react-native';
import { NativeText } from '#primitives/content/native-text';
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

const hostSize = {
  matchContents: { vertical: true },
  style: { width: '100%' },
} satisfies Pick<HostProps, 'matchContents' | 'style'>;

export function ChoiceHost(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <Host {...hostSize}>{props.children}</Host>;
}

// A Drill row names its own Combobox, so only a field draws its own label.
export function ChoiceField(props: FieldProps): React.JSX.Element {
  return props.variant === 'row' ? (
    props.children
  ) : (
    <LabelledField {...props} />
  );
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
