import type { ListItemStepperProps } from './list-item-stepper';

type NativeRange = { value: number; step: number; min: number; max: number };

// Expo's SwiftUI Stepper bridges Int, with 0...100 defaults. Pass bounds explicitly.
export function nativeStepperRange(
  props: ListItemStepperProps,
): NativeRange | undefined {
  const range = {
    value: props.value,
    step: props.step ?? 1,
    ...nativeBounds(props),
  };

  return compatibleRange(range) ? range : undefined;
}

function compatibleRange(range: NativeRange): boolean {
  return (
    Object.values(range).every(Number.isSafeInteger) && orderedRange(range)
  );
}

function orderedRange({ value, step, min, max }: NativeRange): boolean {
  return step > 0 && value >= min && value <= max;
}

function nativeBounds(
  props: ListItemStepperProps,
): Pick<NativeRange, 'min' | 'max'> {
  return {
    min: props.min ?? Number.MIN_SAFE_INTEGER,
    max: props.max ?? Number.MAX_SAFE_INTEGER,
  };
}
