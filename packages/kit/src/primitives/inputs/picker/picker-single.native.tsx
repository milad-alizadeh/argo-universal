import { type ComponentType, useState } from 'react';
import { ChoiceField, ChoiceHost } from '#primitives/native/choice-field';
import { PickerDrillIn, drillInLimit } from './picker-drill-in';
import { menuTag, messageTag, placeholderTag } from './picker-menu-tags';
import { PickerNativeMenu } from './picker-native-menu';
import type {
  PickerMenuItem,
  PickerMenuProps,
} from './picker-native-menu-props';
import type { SinglePickerProps } from './picker-props';
import {
  choosePickerOption,
  pickerOption,
  pickerOptionsMessage,
  pickerValue,
} from './picker-selection';

type MenuChoice = Pick<PickerMenuProps, 'selectedValue' | 'onValueChange'> & {
  key: number;
};

// A SwiftUI menu Picker on iOS, a Material exposed dropdown on Android.
export function SinglePicker<Value extends string>(
  props: SinglePickerProps<Value>,
): React.JSX.Element {
  if (props.options.length > drillInLimit) return <PickerDrillIn {...props} />;

  return <PickerControl {...props} />;
}

function PickerControl<Value extends string>(
  props: SinglePickerProps<Value>,
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
  props: SinglePickerProps<Value>,
): React.JSX.Element {
  const { key, ...choice } = useMenuChoice(props);

  return (
    <PickerNativeMenu
      key={key}
      {...choice}
      enabled={!props.disabled}
      items={menuItems(props)}
    />
  );
}

// A choice the Picker cannot take remounts it, so the native control drops back to the current value.
function useMenuChoice<Value extends string>(
  props: SinglePickerProps<Value>,
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
  props: SinglePickerProps<Value>,
): string {
  const option = pickerOption(props);

  return option ? menuTag(option.value) : placeholderTag;
}

// Universal items cannot be disabled, so the menu leaves out disabled options and shows a load message as an item that does nothing.
function menuItems<Value extends string>(
  props: SinglePickerProps<Value>,
): PickerMenuItem[] {
  const message = pickerOptionsMessage(props);
  const current = { label: pickerValue(props), value: menuSelection(props) };

  if (message) return [current, { label: message, value: messageTag }];

  const choices = props.options
    .filter((option) => !option.disabled || option.value === props.value)
    .map((option) => ({ label: option.label, value: menuTag(option.value) }));

  return pickerOption(props) ? choices : [current, ...choices];
}

function chooseTag<Value extends string>(
  props: SinglePickerProps<Value>,
  tag: string,
): boolean {
  const option = props.options.find(
    (item) => menuTag(item.value) === tag && !item.disabled,
  );

  if (!option || props.disabled) return false;
  choosePickerOption(props, option.value);

  return true;
}

SinglePicker satisfies ComponentType<SinglePickerProps<string>>;
