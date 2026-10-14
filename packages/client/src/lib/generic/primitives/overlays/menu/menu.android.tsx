import { DropdownMenu, type DropdownMenuProps } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useState } from 'react';
import { Host } from '../../native/host';
import { usePrimitiveColor } from '../../native/primitive-color';
import { MenuActionItem, MenuChoice } from './menu-choice.android';
import {
  type ActionMenuProps,
  type ChoiceMenuProps,
  type MenuProps,
  isActionMenu,
} from './menu-props';
import { MenuTrigger } from './menu-trigger.android';

export function Menu<Value extends string>(
  props: MenuProps<Value>,
): React.JSX.Element {
  const { open, setOpen, run } = useMenuState(props);

  return (
    <Host matchContents>
      <MenuPopup expanded={open} onDismissRequest={() => setOpen(false)}>
        <DropdownMenu.Trigger>
          <MenuTrigger {...props} onOpen={() => setOpen(true)} />
        </DropdownMenu.Trigger>
        <MenuRows {...props} onRun={run} />
      </MenuPopup>
    </Host>
  );
}

function MenuRows<Value extends string>(
  props: MenuProps<Value> & { onRun: MenuState['run'] },
): React.JSX.Element {
  if (isActionMenu(props)) return <MenuActions {...props} />;

  return (
    <MenuItems
      {...props}
      onChoose={(value) => props.onRun(() => props.onValueChange(value))}
    />
  );
}

interface MenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
  // Closes the menu, then runs what the item does.
  run: (select: () => void) => void;
}

function useMenuState<Value extends string>(
  props: MenuProps<Value>,
): MenuState {
  const [open, setOpen] = useState(false);

  if (props.disabled && open) setOpen(false);

  function run(select: () => void): void {
    setOpen(false);
    select();
  }

  return { open, setOpen, run };
}

function MenuActions(
  props: ActionMenuProps & { onRun: MenuState['run'] },
): React.JSX.Element {
  return (
    <DropdownMenu.Items>
      {props.actions.map((action) => (
        <MenuActionItem
          key={action.label}
          label={action.label}
          onSelect={() => props.onRun(action.onSelect)}
        />
      ))}
    </DropdownMenu.Items>
  );
}

function MenuItems<Value extends string>(
  props: ChoiceMenuProps<Value> & { onChoose: (value: Value) => void },
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
  props: ChoiceMenuProps<Value> & { onChoose: (value: Value) => void },
  value: Value,
): ChoiceState {
  return {
    selected: value === props.value,
    onChoose: () => props.onChoose(value),
  };
}
