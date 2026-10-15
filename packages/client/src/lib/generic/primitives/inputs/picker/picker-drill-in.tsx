import type { PickerProps } from './picker-props';

// Only iOS swaps a long list for a searchable page; Material's dropdown scrolls a list of any length.
export const drillInLimit = Number.POSITIVE_INFINITY;

export function PickerDrillIn<Value extends string>(
  _props: PickerProps<Value>,
): React.JSX.Element | null {
  return null;
}
