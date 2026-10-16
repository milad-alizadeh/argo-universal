import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon, IconSlot } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Text } from '#primitives/display/text';
import type { IconName } from '../../../symbols/icon-names';
import type { KeyboardFocus } from './menu-choices';
import type { MenuOption } from './menu-props';
import { actionItemTextClassName, choiceRowClassName } from './menu-styles';

type MenuRadioItemProps = {
  choice: MenuOption<string>;
  focus: KeyboardFocus;
};

export function MenuRadioItem(props: MenuRadioItemProps): React.JSX.Element {
  const { choice, focus } = props;

  return (
    <RadixMenu.RadioItem
      asChild
      {...radioValue(choice)}
      {...focusTracking(focus)}
    >
      <View className={radioItemClassName(focus.keyboardFocus)}>
        <MenuRadioContent label={choice.label} icon={choice.icon} />
      </View>
    </RadixMenu.RadioItem>
  );
}

function radioValue(
  choice: MenuOption<string>,
): Pick<
  RadixMenu.DropdownMenuRadioItemProps,
  'value' | 'textValue' | 'disabled'
> {
  return {
    value: choice.value,
    textValue: choice.label,
    disabled: choice.disabled,
  };
}

type FocusTracking = Pick<
  RadixMenu.DropdownMenuContentProps,
  'onKeyDown' | 'onPointerMove'
>;

// A key press shows the focus ring and a pointer move hides it again.
export function focusTracking(focus: KeyboardFocus): FocusTracking {
  return {
    onKeyDown: () => focus.onKeyboardFocusChange(true),
    onPointerMove: () => focus.onKeyboardFocusChange(false),
  };
}

function radioItemClassName(keyboardFocus: boolean): string {
  return cn(
    choiceRowClassName,
    'cursor-default rounded-xl outline-0 hover:bg-hover focus:bg-hover active:bg-pressed web:data-disabled:pointer-events-none web:data-disabled:opacity-50',
    keyboardFocus &&
      'focus-visible:outline-2 focus-visible:outline-foreground focus-visible:-outline-offset-2',
  );
}

function MenuRadioContent(props: {
  label: string;
  icon?: IconName;
}): React.JSX.Element {
  return (
    <>
      <RadioIcon icon={props.icon} />
      <RadioLabel label={props.label} />
      <RadioIndicator />
    </>
  );
}

function RadioLabel(props: { label: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text role="body" className={actionItemTextClassName}>
        {props.label}
      </Text>
    </View>
  );
}

function RadioIndicator(): React.JSX.Element {
  return (
    <IconSlot role="body">
      <RadixMenu.ItemIndicator asChild>
        <View>
          <SelectedCheck className="text-foreground" />
        </View>
      </RadixMenu.ItemIndicator>
    </IconSlot>
  );
}

// The option's icon leads the row: a Body-size glyph in a list row's leading slot.
function RadioIcon(props: { icon?: IconName }): React.JSX.Element | null {
  if (!props.icon) return null;

  return (
    <IconSlot role="row">
      <Icon name={props.icon} role="body" />
    </IconSlot>
  );
}
