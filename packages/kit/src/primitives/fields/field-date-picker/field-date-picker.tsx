import {
  createElement,
  useCallback,
  useRef,
  type ComponentProps,
  type ReactElement,
  type RefObject,
} from 'react';
import { Pressable, type GestureResponderEvent } from 'react-native';
import { cn } from '#kit/utils';
import {
  RowTitle,
  rowPressTargetClassName,
  useRowPressable,
} from '#primitives/fields/field-row';
import { inputType } from '#primitives/native/date-value';
import type { FieldDatePickerProps } from './field-date-picker-props';

/*
 * The title, then the browser's own date, time or datetime-local input at the row's end, as iOS's compact picker sits
 * in its row: the browser formats the value and draws its picker. The whole row presses to open the picker, and the
 * input stays the one control that takes focus.
 */
export function FieldDatePicker(props: FieldDatePickerProps): ReactElement {
  const [input, onPress] = useOpenPicker();

  useRowPressable(!props.disabled);

  return (
    <Pressable {...rowProps(props, onPress)}>
      <RowTitle {...props} />
      <DateInput {...props} inputRef={input} />
    </Pressable>
  );
}

function useOpenPicker(): [
  RefObject<HTMLInputElement | null>,
  (event: GestureResponderEvent) => void,
] {
  const input = useRef<HTMLInputElement>(null);

  const onPress = useCallback(
    (event: GestureResponderEvent) => openPicker(event, input),
    [],
  );

  return [input, onPress];
}

const rowProps = (
  props: FieldDatePickerProps,
  onPress: (event: GestureResponderEvent) => void,
): ComponentProps<typeof Pressable> => ({
  accessible: false,
  focusable: false,
  disabled: props.disabled,
  onPress,
  className: rowClassName,
});

const rowClassName = cn(
  rowPressTargetClassName,
  'flex flex-row items-center justify-between web:cursor-default web:disabled:cursor-not-allowed',
);

// A press on the input itself is the browser's own; a press anywhere else on the row opens its picker.
function openPicker(
  event: GestureResponderEvent,
  ref: RefObject<HTMLInputElement | null>,
): void {
  const input = ref.current;

  if (input && !onInput(event, input)) input.showPicker();
}

function onInput(
  event: GestureResponderEvent,
  input: HTMLInputElement,
): boolean {
  const target: unknown = event.target;

  return target instanceof Node && input.contains(target);
}

const inputClasses =
  'type-body min-w-0 bg-transparent text-foreground outline-none disabled:text-muted-foreground';

type InputProps = FieldDatePickerProps & {
  inputRef: RefObject<HTMLInputElement | null>;
};

const DateInput = (props: InputProps): ReactElement =>
  createElement('input', {
    ref: props.inputRef,
    type: inputType(props.mode),
    value: props.value ?? '',
    disabled: props.disabled,
    'aria-label': props.title,
    className: inputClasses,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      props.onValueChange(event.target.value),
  });
