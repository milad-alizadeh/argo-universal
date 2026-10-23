import {
  chosenValues,
  choose,
  type FieldPickerProps,
} from './field-picker-model';

type ScreenChoiceProps = FieldPickerProps & { onClose?: () => void };

export function change(
  props: ScreenChoiceProps,
  next: readonly string[],
): void {
  if (props.multiple) toggleChange(props, next);
  else pickChange(props, next);
}

// A single section reports the pressed value alone, even the chosen one, and a choice closes the page.
function pickChange(props: ScreenChoiceProps, next: readonly string[]): void {
  const [pressed] = next;

  if (pressed === undefined) return;

  choose(props, pressed);
  props.onClose?.();
}

// A multiple section reports its whole selection toggled; the value that differs from the held one is the press.
function toggleChange(props: ScreenChoiceProps, next: readonly string[]): void {
  const held = chosenValues(props);

  const pressed = [...next, ...held].find(
    (value) => next.includes(value) !== held.includes(value),
  );

  if (pressed !== undefined) choose(props, pressed);
}
