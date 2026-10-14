import * as MenuPrimitive from '@rn-primitives/dropdown-menu';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { IconSlot } from '#primitives/display/icon/icon';
import { SelectedCheck } from '../../display/selected-check';
import { Text } from '../../display/text/text';
import type { MenuProps } from './menu-props';

export type { MenuProps } from './menu-props';

type KeyboardFocus = {
  keyboardFocus: boolean;
  onKeyboardFocusChange: (keyboardFocus: boolean) => void;
};

type RadioItemProps = React.ComponentProps<typeof MenuPrimitive.RadioItem>;

type MenuTriggerProps = Pick<
  MenuProps<string>,
  'accessibilityLabel' | 'disabled' | 'trigger'
> & { focus: KeyboardFocus };

type MenuChoicesProps<Value extends string> = MenuProps<Value> & {
  focus: KeyboardFocus;
};

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const focus = useKeyboardFocus();

  return (
    <MenuPrimitive.Root>
      <MenuTrigger {...props} focus={focus} />
      <MenuPrimitive.Portal>
        <MenuContent {...props} focus={focus} />
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

function useKeyboardFocus(): KeyboardFocus {
  const [keyboardFocus, onKeyboardFocusChange] = useState(false);

  return { keyboardFocus, onKeyboardFocusChange };
}

function MenuTrigger(props: MenuTriggerProps): React.JSX.Element {
  return (
    <MenuPrimitive.Trigger
      asChild
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled}
      onKeyDown={() => props.focus.onKeyboardFocusChange(true)}
      onPointerDown={() => props.focus.onKeyboardFocusChange(false)}
    >
      {props.trigger}
    </MenuPrimitive.Trigger>
  );
}

function MenuContent<Value extends string>(
  props: MenuChoicesProps<Value>,
): React.JSX.Element {
  return (
    <MenuPrimitive.Content
      align="end"
      onKeyDown={() => props.focus.onKeyboardFocusChange(true)}
      onPointerMove={() => props.focus.onKeyboardFocusChange(false)}
      className="w-65 overflow-hidden bg-popover rounded-2xl py-2 shadow-card dark:border dark:border-border"
    >
      <MenuChoices {...props} />
    </MenuPrimitive.Content>
  );
}

function MenuChoices<Value extends string>({
  focus,
  ...props
}: MenuChoicesProps<Value>): React.JSX.Element {
  return (
    <MenuPrimitive.RadioGroup
      value={props.value}
      onValueChange={selectChoice(props)}
    >
      {props.choices.map((choice) => (
        <MenuRadioItem key={choice.value} choice={choice} focus={focus} />
      ))}
    </MenuPrimitive.RadioGroup>
  );
}

function selectChoice<Value extends string>(
  props: MenuProps<Value>,
): (next: string) => void {
  return (next) => {
    const selected = props.choices.find((choice) => choice.value === next);

    if (selected) props.onValueChange(selected.value);
  };
}

type MenuRadioItemProps = {
  choice: { value: string; label: string };
  focus: KeyboardFocus;
};

function MenuRadioItem(props: MenuRadioItemProps): React.JSX.Element {
  const { choice, focus } = props;

  return (
    <MenuPrimitive.RadioItem
      value={choice.value}
      textValue={choice.label}
      onPointerMove={() => focus.onKeyboardFocusChange(false)}
      onKeyDown={radioKeyDown(focus.onKeyboardFocusChange)}
      className={radioItemClassName(focus.keyboardFocus)}
    >
      <MenuRadioContent label={choice.label} />
    </MenuPrimitive.RadioItem>
  );
}

function radioKeyDown(
  onKeyboardFocusChange: KeyboardFocus['onKeyboardFocusChange'],
): NonNullable<RadioItemProps['onKeyDown']> {
  return (event) => {
    onKeyboardFocusChange(true);

    // The RN adapter selects on keydown; stop Radix's synthetic click selecting twice.
    if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
  };
}

function radioItemClassName(keyboardFocus: boolean): string {
  return cn(
    'min-h-9 flex-row items-center gap-3 cursor-default rounded-none outline-0 px-4 py-1.5 hover:bg-muted focus:bg-muted active:bg-border',
    keyboardFocus &&
      'focus-visible:outline-2 focus-visible:outline-foreground focus-visible:-outline-offset-2',
  );
}

function MenuRadioContent(props: { label: string }): React.JSX.Element {
  return (
    <>
      <RadioLabel label={props.label} />
      <RadioIndicator />
    </>
  );
}

function RadioLabel(props: { label: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text role="body" className="select-none text-popover-foreground">
        {props.label}
      </Text>
    </View>
  );
}

function RadioIndicator(): React.JSX.Element {
  return (
    <IconSlot role="control">
      <MenuPrimitive.ItemIndicator>
        <SelectedCheck className="text-popover-foreground" />
      </MenuPrimitive.ItemIndicator>
    </IconSlot>
  );
}
