import {
  Picker as UniversalPicker,
  type PickerProps as UniversalPickerProps,
} from '@expo/ui';
import { type ComponentType, createElement, useState } from 'react';
import { View } from 'react-native';
import {
  FieldDescriptionFooter,
  useFieldDescription,
} from '#primitives/fields/field-description';
import { ChoiceField, ChoiceHost } from '#primitives/native/choice-field';
import { PickerDrillIn, drillInLimit } from './picker-drill-in';
import { menuTag, messageTag, placeholderTag } from './picker-menu-tags';
import type { PickerProps } from './picker-props';
import {
  choosePickerOption,
  pickerOption,
  pickerOptionsMessage,
  pickerValue,
} from './picker-selection';

type MenuItem = { label: string; value: string };

type MenuChoice = Pick<
  UniversalPickerProps<string>,
  'selectedValue' | 'onValueChange'
> & { key: number };

// Expo UI's universal Picker: a SwiftUI menu Picker on iOS, a Material exposed dropdown on Android.
export function Picker<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const field = useFieldDescription(props);

  if (props.options.length > drillInLimit) return <PickerDrillIn {...props} />;

  return createElement(
    View,
    { className: 'gap-2' },
    <PickerControl {...props} invalid={field.invalid} />,
    <FieldDescriptionFooter {...field} />,
  );
}

function PickerControl<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <ChoiceHost>
      <ChoiceField {...props}>
        <PickerMenu {...props} />
      </ChoiceField>
    </ChoiceHost>
  );
}

function PickerMenu<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return createElement(
    UniversalPicker<string>,
    { ...useMenuChoice(props), enabled: !props.disabled },
    menuItems(props).map((item) => (
      <UniversalPicker.Item key={item.value} {...item} />
    )),
  );
}

// A choice the Picker cannot take remounts it, so the native control drops back to the current value.
function useMenuChoice<Value extends string>(
  props: PickerProps<Value>,
): MenuChoice {
  const [revision, setRevision] = useState(0);

  return {
    key: revision,
    selectedValue: menuSelection(props),
    onValueChange: (tag) => {
      if (!chooseTag(props, tag)) setRevision((count) => count + 1);
      props.onBlur?.();
    },
  };
}

function menuSelection<Value extends string>(
  props: PickerProps<Value>,
): string {
  const option = pickerOption(props);

  return option ? menuTag(option.value) : placeholderTag;
}

// Universal items cannot be disabled, so the menu leaves out disabled options and shows a load message as an item that does nothing.
function menuItems<Value extends string>(
  props: PickerProps<Value>,
): MenuItem[] {
  const message = pickerOptionsMessage(props);
  const current = { label: pickerValue(props), value: menuSelection(props) };

  if (message) return [current, { label: message, value: messageTag }];

  const choices = props.options
    .filter((option) => !option.disabled || option.value === props.value)
    .map((option) => ({ label: option.label, value: menuTag(option.value) }));

  return pickerOption(props) ? choices : [current, ...choices];
}

function chooseTag<Value extends string>(
  props: PickerProps<Value>,
  tag: string,
): boolean {
  const option = props.options.find(
    (item) => menuTag(item.value) === tag && !item.disabled,
  );

  if (!option || props.disabled) return false;
  choosePickerOption(props, option.value);

  return true;
}

Picker satisfies ComponentType<PickerProps<string>>;
