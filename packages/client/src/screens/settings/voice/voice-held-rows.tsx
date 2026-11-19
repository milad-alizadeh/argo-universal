import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { FieldLabelScope } from '@repo/kit/primitives/fields/field-row';
import { useEffect, useState, type ReactElement } from 'react';
import { SettledValue } from './settled-value';
import { percentLabel } from './voice-call-options';

/*
 * What a row shows while the person edits it: their own value until the Server's changes, so a save coming back, or
 * a change from another Device, replaces it.
 */
function useHeld<Value>(server: Value): [Value, (value: Value) => void] {
  const [held, setHeld] = useState({ server, value: server });

  if (held.server !== server) setHeld({ server, value: server });

  return [held.value, (value) => setHeld({ server, value })];
}

type TextRowProps = {
  title: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onCommit: (text: string) => void;
};

const textRowProps = (
  props: TextRowProps,
  [text, setText]: [string, (text: string) => void],
): React.ComponentProps<typeof FieldGroup.TextField> => ({
  title: props.title,
  placeholder: props.placeholder,
  multiline: true,
  disabled: props.disabled,
  value: text,
  onChangeText: setText,
  onBlur: () => {
    if (text.trim() !== props.value) props.onCommit(text);
  },
});

/*
 * A text the Server keeps, sent when the field is left and only when it changed. Its title sits above the field on a
 * wide window, as Paper's "1 · Page" draws it, so a long title is never cut short.
 */
export function HeldTextRow(props: TextRowProps): ReactElement {
  return (
    <FieldLabelScope>
      <FieldGroup.TextField {...textRowProps(props, useHeld(props.value))} />
    </FieldLabelScope>
  );
}

// How long a slider rests before its value is sent.
const settleMs = 250;

type SliderRowProps = {
  title: string;
  value: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
};

// Sends the value a drag rests on, and what is waiting when the row goes away.
function useSettled(): SettledValue<number> {
  const [settled] = useState(() => new SettledValue<number>(settleMs));

  useEffect(() => (): void => settled.flush(), [settled]);

  return settled;
}

const sliderRowProps = (
  props: SliderRowProps,
  [value, setValue]: [number, (value: number) => void],
  settled: SettledValue<number>,
): React.ComponentProps<typeof FieldGroup.Slider> => ({
  title: props.title,
  max: props.max,
  disabled: props.disabled,
  min: 0,
  step: 1,
  value,
  valueLabel: percentLabel(Math.round(value)),
  onValueChange: (next) =>
    moved(next, setValue, () => settled.push(Math.round(next), props.onCommit)),
});

// The thumb follows the pointer at once; the Server hears the value once the drag rests.
const moved = (
  next: number,
  show: (value: number) => void,
  send: () => void,
): void => {
  show(next);
  send();
};

// A percentage the Server keeps: it moves under the pointer and is sent once the drag rests.
export function HeldSliderRow(props: SliderRowProps): ReactElement {
  const held = useHeld(props.value);
  const settled = useSettled();

  return <FieldGroup.Slider {...sliderRowProps(props, held, settled)} />;
}
