import type { FieldPickerProps } from './field-picker-model';

type Payload = string | readonly string[];

type Toggling = Pick<FieldPickerProps, 'onToggle'>;

// The one value whose being held differs between the list held and the list a pick reports.
function toggledValue(
  held: readonly string[],
  next: readonly string[],
): string | undefined {
  return [...next, ...held].find(
    (value) => next.includes(value) !== held.includes(value),
  );
}

/*
 * A `multiple` pick also reports the one option it toggled and whether it is now chosen: an Operation param cannot
 * hold a list, so a Plugin hears a toggle where the App hears the whole list.
 */
export function reportToggle(
  caller: Toggling,
  held: readonly string[],
  payload: Payload,
): void {
  if (typeof payload === 'string') return;

  toggle(caller.onToggle, toggledValue(held, payload), payload);
}

function toggle(
  onToggle: Toggling['onToggle'],
  value: string | undefined,
  next: readonly string[],
): void {
  if (onToggle && value !== undefined)
    void onToggle({ value, on: next.includes(value) });
}

type Creating = Pick<FieldPickerProps, 'create' | 'createLabel' | 'onCreate'>;

// A Plugin's `createLabel` and `onCreate` offer the App's own create row; the App sets `create` itself.
export const createOf = (caller: Creating): FieldPickerProps['create'] =>
  caller.create ?? pluginCreate(caller);

function pluginCreate({
  createLabel,
  onCreate,
}: Creating): FieldPickerProps['create'] {
  return createLabel && onCreate
    ? { label: createLabel, onCreate: (text) => void onCreate(text) }
    : undefined;
}
