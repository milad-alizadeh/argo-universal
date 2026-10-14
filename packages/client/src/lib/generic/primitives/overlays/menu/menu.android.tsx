import { DropdownMenu, type DropdownMenuProps } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useState } from 'react';
import { Host } from '../../native/host';
import { usePrimitiveColor } from '../../native/primitive-color';
import { MenuChoice } from './menu-choice.android';
import type { MenuProps } from './menu-props';
import { MenuTrigger } from './menu-trigger.android';

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const { open, setOpen, choose } = useMenuState(props);

  return (
    <Host matchContents>
      <MenuPopup expanded={open} onDismissRequest={() => setOpen(false)}>
        <DropdownMenu.Trigger>
          <MenuTrigger {...props} onOpen={() => setOpen(true)} />
        </DropdownMenu.Trigger>
        <MenuItems {...props} onChoose={choose} />
      </MenuPopup>
    </Host>
  );
}

interface MenuState<Value extends string> {
  open: boolean;
  setOpen: (open: boolean) => void;
  choose: (value: Value) => void;
}

function useMenuState<Value extends string>(
  props: MenuProps<Value>,
): MenuState<Value> {
  const [open, setOpen] = useState(false);

  if (props.disabled && open) setOpen(false);

  function choose(value: Value): void {
    setOpen(false);
    props.onValueChange(value);
  }

  return { open, setOpen, choose };
}

function MenuItems<Value extends string>(
  props: MenuProps<Value> & { onChoose: (value: Value) => void },
): React.JSX.Element {
  return (
    <DropdownMenu.Items>
      {props.choices.map((choice) => (
        <MenuChoice
          key={choice.value}
          {...choice}
          {...choiceState(props, choice.value)}
        />
      ))}
    </DropdownMenu.Items>
  );
}

function MenuPopup(
  props: Pick<DropdownMenuProps, 'expanded' | 'onDismissRequest' | 'children'>,
): React.JSX.Element {
  const popupColor = usePrimitiveColor('text-popover dark:text-neutral-900');

  return <DropdownMenu {...props} color={popupColor} />;
}

interface ChoiceState {
  selected: boolean;
  onChoose: () => void;
}

function choiceState<Value extends string>(
  props: MenuProps<Value> & { onChoose: (value: Value) => void },
  value: Value,
): ChoiceState {
  return {
    selected: value === props.value,
    onChoose: () => props.onChoose(value),
  };
}
