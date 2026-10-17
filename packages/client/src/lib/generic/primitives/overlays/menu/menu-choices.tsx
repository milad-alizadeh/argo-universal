import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { useIconBox } from '../../../symbols/icon-role';
import { contentFocus } from './menu-content-focus';
import { MenuLoadingRow } from './menu-loading';
import {
  type ChoiceMenuProps,
  type GroupedChoiceMenuProps,
  type MenuChoiceGroup,
  menuChoiceGroups,
} from './menu-props';
import { MenuRadioItem } from './menu-radio-item';
import {
  menuGroupLineClassName,
  menuGroupSeparatorClassName,
  menuRowsClassName,
} from './menu-styles';

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

// A choice menu's web drawing: radio rows, the chosen one checked, each later group after a section line.
export function MenuChoiceContent<Value extends string>(
  props: MenuChoicesProps<Value>,
): React.JSX.Element {
  return (
    <RadixMenu.Content
      align={props.align ?? 'end'}
      loop
      {...contentFocus(props.focus)}
    >
      <View className="w-65 overflow-hidden bg-card rounded-2xl p-1 shadow-card dark:border dark:border-border">
        {props.loading ? <MenuLoadingRow /> : <MenuChoices {...props} />}
      </View>
    </RadixMenu.Content>
  );
}

function MenuChoices<Value extends string>({
  focus,
  ...props
}: MenuChoicesProps<Value>): React.JSX.Element {
  return (
    <>
      {menuChoiceGroups(props).map((group, index) =>
        groupRows(group, index, focus),
      )}
    </>
  );
}

function groupRows(
  group: MenuChoiceGroup,
  index: number,
  focus: KeyboardFocus,
): React.JSX.Element {
  return (
    <MenuChoiceGroupRows
      key={menuGroupKey(group)}
      group={group}
      first={index === 0}
      focus={focus}
    />
  );
}

// A group is known by its options, which no other group of the menu shares.
const menuGroupKey = (group: MenuChoiceGroup): string =>
  group.options.map((choice) => choice.value).join(' ');

type MenuChoiceGroupRowsProps = {
  group: MenuChoiceGroup;
  first: boolean;
  focus: KeyboardFocus;
};

// One group's radio rows; a later group is set apart by a section line, and its heading when it has one.
function MenuChoiceGroupRows(
  props: MenuChoiceGroupRowsProps,
): React.JSX.Element {
  return (
    <>
      {props.first ? null : <MenuGroupSeparator />}
      <MenuGroupHeading
        label={props.group.label}
        inset={props.group.options.some((choice) => choice.icon)}
      />
      <MenuChoiceRadios {...props} />
    </>
  );
}

// Radix's Separator gives the line role="separator", so it is announced and skipped by the keyboard.
function MenuGroupSeparator(): React.JSX.Element {
  return (
    <RadixMenu.Separator asChild>
      <View className={menuGroupSeparatorClassName}>
        <View className={menuGroupLineClassName} />
      </View>
    </RadixMenu.Separator>
  );
}

function MenuChoiceRadios({
  group,
  focus,
}: MenuChoiceGroupRowsProps): React.JSX.Element {
  const radios = group.options.map((choice) => (
    <MenuRadioItem key={choice.value} choice={choice} focus={focus} />
  ));

  const { value, onValueChange } = group;

  return (
    <RadixMenu.RadioGroup asChild value={value} onValueChange={onValueChange}>
      <View className={menuRowsClassName}>{radios}</View>
    </RadixMenu.RadioGroup>
  );
}

// With icons, the heading keeps the rows' empty icon slot, so it lines up with the labels after it.
function MenuGroupHeading(props: {
  label?: string;
  inset: boolean;
}): React.JSX.Element | null {
  if (!props.label) return null;

  return (
    <View className="flex-row gap-3 px-3 pb-1 pt-1.5">
      {props.inset ? <IconSlotWidth /> : null}
      <Text role="secondary" className="select-none">
        {props.label}
      </Text>
    </View>
  );
}

// The width of the rows' leading icon slot, with no height, so the heading stays as tall as its text.
function IconSlotWidth(): React.JSX.Element {
  return <View style={{ width: useIconBox('row').width }} />;
}
