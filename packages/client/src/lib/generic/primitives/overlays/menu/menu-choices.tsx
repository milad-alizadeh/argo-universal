import * as MenuPrimitive from '@rn-primitives/dropdown-menu';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { MenuLoadingRow } from './menu-loading';
import {
  type ChoiceMenuProps,
  type GroupedChoiceMenuProps,
  type MenuChoiceGroup,
  menuChoiceGroups,
} from './menu-props';
import { MenuRadioItem } from './menu-radio-item';

export type KeyboardFocus = {
  keyboardFocus: boolean;
  onKeyboardFocusChange: (keyboardFocus: boolean) => void;
};

type MenuChoicesProps<Value extends string> = (
  | ChoiceMenuProps<Value>
  | GroupedChoiceMenuProps
) & {
  focus: KeyboardFocus;
};

export function useKeyboardFocus(): KeyboardFocus {
  const [keyboardFocus, onKeyboardFocusChange] = useState(false);

  return { keyboardFocus, onKeyboardFocusChange };
}

// A choice menu's web drawing: radio rows, the chosen one checked.
export function MenuChoiceContent<Value extends string>(
  props: MenuChoicesProps<Value>,
): React.JSX.Element {
  return (
    <MenuPrimitive.Content
      align={props.align ?? 'end'}
      onKeyDown={() => props.focus.onKeyboardFocusChange(true)}
      onPointerMove={() => props.focus.onKeyboardFocusChange(false)}
      className="w-65 overflow-hidden bg-card rounded-2xl p-1 shadow-card dark:border dark:border-border"
    >
      {props.loading ? <MenuLoadingRow /> : <MenuChoices {...props} />}
    </MenuPrimitive.Content>
  );
}

function MenuChoices<Value extends string>({
  focus,
  ...props
}: MenuChoicesProps<Value>): React.JSX.Element[] {
  return menuChoiceGroups(props).map((group, index) => (
    <MenuChoiceGroupRows
      key={menuGroupKey(group)}
      group={group}
      first={index === 0}
      focus={focus}
    />
  ));
}

// A group is known by its options, which no other group of the menu shares.
const menuGroupKey = (group: MenuChoiceGroup): string =>
  group.options.map((choice) => choice.value).join(' ');

type MenuChoiceGroupRowsProps = {
  group: MenuChoiceGroup;
  first: boolean;
  focus: KeyboardFocus;
};

// One group's radio rows; a later group is set apart by space, and its heading when it has one.
function MenuChoiceGroupRows(
  props: MenuChoiceGroupRowsProps,
): React.JSX.Element {
  return (
    <>
      {props.first ? null : <View className="h-2.25" />}
      <MenuGroupHeading label={props.group.label} />
      <MenuChoiceRadios {...props} />
    </>
  );
}

function MenuChoiceRadios({
  group,
  focus,
}: MenuChoiceGroupRowsProps): React.JSX.Element {
  return (
    <MenuPrimitive.RadioGroup
      value={group.value}
      onValueChange={group.onValueChange}
    >
      {group.options.map((choice) => (
        <MenuRadioItem key={choice.value} choice={choice} focus={focus} />
      ))}
    </MenuPrimitive.RadioGroup>
  );
}

function MenuGroupHeading(props: { label?: string }): React.JSX.Element | null {
  if (!props.label) return null;

  return (
    <View className="px-3 pb-1 pt-1.5">
      <Text role="secondary" className="select-none">
        {props.label}
      </Text>
    </View>
  );
}
