import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { menuDefaults } from '@repo/contracts/kit-tokens';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { menuGroupGapClassName } from '#kit/menu-surface';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import { contentFocus } from './menu-content-focus';
import { MenuLoadingRow } from './menu-loading';
import {
  type ChoiceMenuProps,
  type GroupedChoiceMenuProps,
  type MenuChoiceGroup,
  menuChoiceGroups,
} from './menu-props';
import { MenuRadioItem } from './menu-radio-item';
import { menuContentClassName, menuRowsClassName } from './menu-styles';

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

function choiceContentProps<Value extends string>(
  props: MenuChoicesProps<Value>,
): RadixMenu.DropdownMenuContentProps {
  return {
    align: props.align ?? menuDefaults.align,
    loop: true,
    className: 'z-50',
    ...contentFocus(props.focus),
  };
}

// A choice menu's web drawing: radio rows, the chosen one checked, each later group 8px below the one before.
export function MenuChoiceContent<Value extends string>(
  props: MenuChoicesProps<Value>,
): React.JSX.Element {
  return (
    // Radix's popper wrapper copies the content's z-index, so the menu opens above a sheet.
    <RadixMenu.Content {...choiceContentProps(props)}>
      <View className={cn(menuContentClassName, 'w-65')}>
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

// One group's radio rows; a later group is set apart by a gap, and its heading when it has one.
function MenuChoiceGroupRows(
  props: MenuChoiceGroupRowsProps,
): React.JSX.Element {
  return (
    <>
      {props.first ? null : <MenuGroupSeparator />}
      <MenuGroupHeading label={props.group.label} />
      <MenuChoiceRadios {...props} />
    </>
  );
}

// Groups sit 8px apart with no line (Paper's Menu "Section line"); Radix's Separator gives the gap role="separator", so it is announced and skipped by the keyboard.
function MenuGroupSeparator(): React.JSX.Element {
  return (
    <RadixMenu.Separator asChild>
      <View className={menuGroupGapClassName} />
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

// The heading starts where its rows do, at their icon when they have one, as Paper's View options headings.
function MenuGroupHeading(props: { label?: string }): React.JSX.Element | null {
  if (!props.label) return null;

  return (
    <View className="px-2 pb-1 pt-1.5">
      <Text role="secondary" className="select-none">
        {props.label}
      </Text>
    </View>
  );
}
