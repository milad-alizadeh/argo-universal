import { createElement, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { requiredLabel } from '#primitives/fields/field';
import {
  FieldDescriptionFooter,
  useFieldDescription,
  type FieldDescription,
} from '#primitives/fields/field-description';
import { ComboboxTrigger } from '#primitives/inputs/combobox';
import { Drill, type DrillProps } from '#primitives/overlays/drill';
import { useInListItem } from '../../../list-item-control-context';
import { Choices } from './picker-multiple-choices';
import { pickerSummary } from './picker-multiple-value';
import type { MultiplePickerProps } from './picker-props';

type FieldProps<Value extends string> = MultiplePickerProps<Value> &
  FieldDescription;

// Desktop: a listbox of checks that stays open; iOS: a drill-in Sheet of checks.
export function MultiplePicker<Value extends string>(
  props: MultiplePickerProps<Value>,
): ReactElement {
  const row = useInListItem() || props.variant === 'row';

  if (row) return <ChoicesDrill {...props} />;

  return <StandaloneField {...props} />;
}

function StandaloneField<Value extends string>(
  props: MultiplePickerProps<Value>,
): ReactElement {
  const field = useFieldDescription(props);
  const trigger = <FieldTrigger {...props} {...field} />;

  return createElement(
    View,
    { className: 'gap-2' },
    <FieldLabel {...props} />,
    <ChoicesDrill {...props} trigger={trigger} />,
    <FieldDescriptionFooter {...field} />,
  );
}

function FieldLabel(
  props: Pick<MultiplePickerProps<string>, 'label' | 'required'>,
): ReactElement | null {
  if (Platform.OS !== 'web') return null;

  return (
    <Text role="body" aria-hidden>
      {requiredLabel(props)}
    </Text>
  );
}

function FieldTrigger<Value extends string>(
  props: FieldProps<Value>,
): ReactElement {
  return (
    <ComboboxTrigger
      {...props}
      valueLabel={pickerSummary(props)}
      chevron="chevron-down"
    />
  );
}

type DrillOwner<Value extends string> = MultiplePickerProps<Value> &
  Pick<DrillProps, 'trigger'>;

function ChoicesDrill<Value extends string>(
  props: DrillOwner<Value>,
): ReactElement {
  return <Drill {...drillProps(props)}>{() => <Choices {...props} />}</Drill>;
}

function drillProps<Value extends string>(
  props: DrillOwner<Value>,
): Omit<DrillProps, 'children'> {
  return {
    label: props.label,
    title: props.label,
    value: pickerSummary(props),
    disabled: props.disabled,
    onClose: props.onBlur,
    contentScrolls: true,
    trigger: props.trigger,
  };
}
