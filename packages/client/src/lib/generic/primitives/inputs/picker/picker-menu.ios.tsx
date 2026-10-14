import { Button, HStack, Menu, Picker, Spacer } from '@expo/ui/swift-ui';
import { buttonStyle, pickerStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createElement, Fragment } from 'react';
import { useInGroupedListItem } from '#primitives/lists/grouped-list-item';
import { NativeSymbol } from '../../../symbols/native-symbol';
import {
  PickerLabel,
  PickerValue,
  usePickerModifiers,
} from './picker-label.ios';
import { MenuOptions } from './picker-menu-options.ios';
import { menuTag, selectedMenuValue } from './picker-menu-tags';
import type { PickerProps } from './picker-props';
import { choosePickerOption, pickerOption } from './picker-selection';

export function NativeMenuPicker<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <Menu
      label={<MenuLabel {...props} />}
      modifiers={usePickerModifiers(props)}
    >
      <MenuControl {...props} />
    </Menu>
  );
}

function MenuLabel<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const row = useInGroupedListItem() || props.variant === 'row';

  return (
    <HStack modifiers={row ? [] : [padding({ horizontal: 16, vertical: 12 })]}>
      <PickerRowContent {...props} />
    </HStack>
  );
}

function MenuControl<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <Picker<string> {...useMenuProps(props)}>
      <MenuOptions {...props} />
    </Picker>
  );
}

function useMenuProps<Value extends string>(
  props: PickerProps<Value>,
): React.ComponentProps<typeof Picker<string>> {
  return {
    label: '',
    selection: menuSelection(props),
    modifiers: [pickerStyle('inline')],
    onSelectionChange: (next) => selectMenuChoice(props, next),
  };
}

function selectMenuChoice<Value extends string>(
  props: PickerProps<Value>,
  next: string,
): void {
  const value = selectedMenuValue(next);

  if (value !== undefined) choosePickerOption(props, value);
  props.onBlur?.();
}

function menuSelection<Value extends string>(
  props: PickerProps<Value>,
): string {
  const option = pickerOption(props);

  return option ? menuTag(option.value) : 'placeholder';
}

export function NativePickerRow<Value extends string>(
  props: PickerProps<Value> & { onPress: () => void },
): React.JSX.Element {
  return createElement(
    Button,
    usePickerRowProps(props),
    <HStack modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
      <PickerRowContent {...props} />
    </HStack>,
  );
}

function usePickerRowProps<Value extends string>(
  props: PickerProps<Value> & { onPress: () => void },
): React.ComponentProps<typeof Button> {
  return {
    onPress: props.onPress,
    modifiers: [...usePickerModifiers(props), buttonStyle('plain')],
  };
}

function PickerRowContent<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const inGroupedListItem = useInGroupedListItem();
  const row = inGroupedListItem || props.variant === 'row';

  return createElement(
    Fragment,
    {},
    !row && <PickerLabel {...props} />,
    <Spacer />,
    <PickerValue {...props} />,
    <NativeSymbol name="chevron-up-down" role="body" />,
  );
}
