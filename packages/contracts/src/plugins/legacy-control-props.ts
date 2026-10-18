import type { z } from 'zod';
import type {
  switchProps,
  checkboxProps,
  sliderProps,
  selectionControlV1,
  sliderV1,
} from './parts/input-control-props';

type BinaryProps =
  | z.output<typeof switchProps>
  | z.output<typeof checkboxProps>;

function oldHandler(
  handler: BinaryProps['onValueChange'],
): Exclude<
  z.input<typeof selectionControlV1>['onChange'],
  boolean | undefined
> {
  return '$event' in handler ? { $event: 'onChange' as const } : handler;
}

export function legacyBinaryProps(
  props: BinaryProps,
): z.input<typeof selectionControlV1> {
  return {
    ...props,
    checked: props.value,
    onChange: oldHandler(props.onValueChange),
    label: 'label' in props ? props.label : (props.accessibilityLabel ?? ''),
  };
}

export function legacySliderProps(
  props: z.output<typeof sliderProps>,
): z.input<typeof sliderV1> {
  return {
    ...props,
    min: props.minimumValue,
    max: props.maximumValue,
    label: props.accessibilityLabel,
    value: props.value ?? props.minimumValue,
    onChange: oldHandler(props.onValueChange),
  };
}
