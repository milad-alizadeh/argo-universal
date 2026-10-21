import { createElement, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';
import {
  FieldDescriptionFooter,
  useFieldDescription,
  type FieldDescription,
} from '#primitives/fields/field-description';
import { Drill, type DrillProps } from '#primitives/overlays/drill';
import { ComboboxContent } from './combobox-content';
import { comboboxPlaceholder } from './combobox-placeholder';
import type { ComboboxProps } from './combobox-props';
import { ComboboxTrigger } from './combobox-trigger';
import { comboboxValue } from './combobox-value';

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
  const trigger = props.trigger ?? <FieldTrigger {...props} />;

  return createElement(
    View,
    { className: 'gap-2' },
    <FieldLabel label={props.label} required={props.required} />,
    <ComboboxControl {...props} trigger={trigger} />,
    <FieldDescriptionFooter {...props.field} />,
  );
}

function FieldTrigger<Value extends string>(
  props: ComboboxProps<Value> & { field: FieldDescription },
): ReactElement {
  return (
    <ComboboxTrigger
      {...props}
      {...props.field}
      valueLabel={comboboxValue(props)}
    />
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
    ...choices(props),
    label: props.label,
    title: props.title ?? props.label,
    valueLeading: props.valueLeading,
    disabled: props.disabled,
    onClose: props.onBlur,
    contentScrolls: true,
    trigger: props.trigger,
    ...opening(props),
  };
}

// How the choices come up: whether a pick keeps them open, and when their page is drawn.
function opening<Value extends string>(
  props: ComboboxProps<Value>,
): Pick<DrillProps, 'keepOpen' | 'mount'> {
  return { keepOpen: props.keepOpen, mount: props.mount };
}

// What the options give the row: the chosen one's label, and the whole list as the page's stand-in.
function choices<Value extends string>(
  props: ComboboxProps<Value>,
): Pick<DrillProps, 'value' | 'placeholder'> {
  return {
    value: props.options.find((entry) => entry.value === props.value)?.label,
    placeholder: comboboxPlaceholder(props),
  };
}

export const Combobox = Object.assign(ComboboxRoot, {
  Content: ComboboxContent,
});
