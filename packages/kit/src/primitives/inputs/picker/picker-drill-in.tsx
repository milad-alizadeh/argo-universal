import type { SinglePickerProps } from './picker-props';

// Only iOS swaps a long list for a searchable page; Material's dropdown scrolls a list of any length.
export const drillInLimit = Number.POSITIVE_INFINITY;

export function PickerDrillIn<Value extends string>(
  _props: SinglePickerProps<Value>,
): React.JSX.Element | null {
  return null;
}
