import { createElement, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/display/text';
import {
  FieldDescriptionFooter,
  useFieldDescription,
  type FieldDescription,
} from '#primitives/fields/field-description';
import { Drill, type DrillProps } from '#primitives/overlays/drill';
import { ComboboxContent } from './combobox-content';
import type { ComboboxProps } from './combobox-props';
import { ComboboxTrigger } from './combobox-trigger';

function ComboboxRoot<Value extends string>(
  props: ComboboxProps<Value>,
): ReactElement {
  const field = useFieldDescription(props);

  return props.variant === 'row' ? (
    <ComboboxControl {...props} />
  ) : (
    <ComboboxField {...props} field={field} />
  );
}

function ComboboxField<Value extends string>(
  props: ComboboxProps<Value> & { field: FieldDescription },
): ReactElement {
  const trigger = props.trigger ?? (
    <ComboboxTrigger {...props} {...props.field} />
  );

  return createElement(
    View,
    { className: 'gap-2' },
    <FieldLabel label={props.label} required={props.required} />,
    <ComboboxControl {...props} trigger={trigger} />,
    <FieldDescriptionFooter {...props.field} />,
  );
}

function FieldLabel(props: {
  label: string;
  required?: boolean;
}): ReactElement | null {
  if (Platform.OS !== 'web') return null;

  return (
    <Text role="body" aria-hidden>
      {props.label}
      {props.required ? ' *' : ''}
    </Text>
  );
}

function ComboboxControl<Value extends string>(
  props: ComboboxProps<Value>,
): ReactElement {
  return (
    <Drill {...drillProps(props)}>
      {(close) => <ComboboxContent {...props} onClose={close} />}
    </Drill>
  );
}

function drillProps<Value extends string>(
  props: ComboboxProps<Value>,
): Omit<DrillProps, 'children'> {
  return {
    label: props.label,
    title: props.title ?? props.label,
    value: props.options.find((entry) => entry.value === props.value)?.label,
    disabled: props.disabled,
    onClose: props.onBlur,
    contentScrolls: true,
    trigger: props.trigger,
  };
}

export const Combobox = Object.assign(ComboboxRoot, {
  Content: ComboboxContent,
});
