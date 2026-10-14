import * as MenuPrimitive from '@rn-primitives/dropdown-menu';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { IconSlot } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Text } from '#primitives/display/text';
import type { ChoiceMenuProps } from './menu-props';

export type KeyboardFocus = {
  keyboardFocus: boolean;
  onKeyboardFocusChange: (keyboardFocus: boolean) => void;
};

type RadioItemProps = React.ComponentProps<typeof MenuPrimitive.RadioItem>;

type MenuChoicesProps<Value extends string> = ChoiceMenuProps<Value> & {
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
      className="w-65 overflow-hidden bg-card rounded-2xl py-2 shadow-card dark:border dark:border-border"
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
  props: ChoiceMenuProps<Value>,
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
      <Text role="body" className="select-none text-card-foreground">
        {props.label}
      </Text>
    </View>
  );
}

function RadioIndicator(): React.JSX.Element {
  return (
    <IconSlot role="control">
      <MenuPrimitive.ItemIndicator>
        <SelectedCheck className="text-card-foreground" />
      </MenuPrimitive.ItemIndicator>
    </IconSlot>
  );
}
