// Desktop and web: an ARIA multi-select listbox, drawn as Picker's Select rows with a leading check.
import { createElement, type KeyboardEvent, type ReactElement } from 'react';
import { menuRowClassName } from '#lib/generic/menu-surface';
import { tintTransitionClassName } from '#lib/generic/motion';
import { IconSlot } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { SelectedCheck } from '#primitives/status/selected-check';
import { cn } from '../../../utils';
import type { ListboxProps } from './picker-multiple-listbox-props';
import { chooseValues, toggled } from './picker-multiple-value';
import type { PickerOption } from './picker-props';

export function ChoiceListbox<Value extends string>(
  props: ListboxProps<Value>,
): ReactElement {
  return createElement(
    'div',
    listboxAttributes(props.label),
    props.shown.map((option) => (
      <ListboxOption key={option.value} {...props} option={option} />
    )),
  );
}

const listboxAttributes = (
  label: string,
): React.HTMLAttributes<HTMLDivElement> => ({
  role: 'listbox',
  'aria-multiselectable': true,
  'aria-label': label,
  className: 'flex max-h-80 flex-col gap-0.5 overflow-y-auto',
  onKeyDown: moveFocus,
});

type OptionProps<Value extends string> = ListboxProps<Value> & {
  option: PickerOption<Value>;
};

function ListboxOption<Value extends string>(
  props: OptionProps<Value>,
): ReactElement {
  const state = optionState(props);
  const toggle = (): void => toggleOption(props, state);

  const keys = (event: KeyboardEvent): void => pressKey(event, toggle);

  return createElement(
    'div',
    { ...optionAttributes(state), onClick: toggle, onKeyDown: keys },
    <OptionCheck checked={state.checked} />,
    <OptionText option={props.option} />,
  );
}

type OptionState = { checked: boolean; disabled: boolean };

function optionState<Value extends string>(
  props: OptionProps<Value>,
): OptionState {
  return {
    checked: (props.value ?? []).includes(props.option.value),
    disabled: props.option.disabled === true || props.disabled === true,
  };
}

const optionAttributes = (
  state: OptionState,
): React.HTMLAttributes<HTMLDivElement> => ({
  role: 'option',
  'aria-selected': state.checked,
  'aria-disabled': state.disabled,
  tabIndex: state.disabled ? -1 : 0,
  className: cn(
    menuRowClassName,
    'flex cursor-default outline-none hover:bg-hover focus-visible:bg-hover active:bg-pressed',
    tintTransitionClassName,
    state.disabled && 'pointer-events-none opacity-50',
  ),
});

function toggleOption<Value extends string>(
  props: OptionProps<Value>,
  state: OptionState,
): void {
  if (state.disabled) return;

  chooseValues(
    props,
    toggled(props.value ?? [], props.option.value, !state.checked),
  );
}

function OptionCheck(props: { checked: boolean }): ReactElement {
  return (
    <IconSlot role="control">
      {props.checked ? <SelectedCheck className="shrink-0" /> : null}
    </IconSlot>
  );
}

function OptionText(props: { option: PickerOption<string> }): ReactElement {
  return createElement(
    'div',
    { className: 'flex min-w-0 flex-1 flex-col' },
    <Text className="type-body select-none">{props.option.label}</Text>,
    props.option.subtitle ? (
      <Text role="secondary">{props.option.subtitle}</Text>
    ) : null,
  );
}

// Space and Enter toggle the focused option, as a listbox does.
function pressKey(event: KeyboardEvent, toggle: () => void): void {
  if (event.key !== ' ' && event.key !== 'Enter') return;

  event.preventDefault();
  toggle();
}

function stepOf(key: string): number | undefined {
  if (key === 'ArrowDown') return 1;

  return key === 'ArrowUp' ? -1 : undefined;
}

// The arrow keys move focus between the enabled options.
function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const step = stepOf(event.key);

  if (step === undefined) return;

  event.preventDefault();
  focusOption(event.currentTarget, step);
}

function focusOption(listbox: HTMLElement, step: number): void {
  const options = [...listbox.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.getAttribute('aria-disabled') !== 'true',
  );

  const current = options.findIndex(
    (option) => option === document.activeElement,
  );

  const next = Math.max(0, Math.min(options.length - 1, current + step));

  options[next]?.focus();
}
