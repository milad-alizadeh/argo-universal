import type {
  FieldPickerMultiple,
  FieldPickerOption,
} from './field-picker-model';

// The one value a person pressed in a `multiple` choice, and whether it is now chosen.
export type PickReport = { value: string; on: boolean };

type Press = {
  multiple: boolean;
  held: readonly string[];
  options: readonly FieldPickerOption[];
  report: (payload: string | readonly string[]) => void;
  onPick: FieldPickerMultiple['onPick'];
};

// A press: a single choice reports the value; a `multiple` one reports the pick, then the list toggled.
export const pressing =
  (press: Press) =>
  (value: string): void => {
    if (!press.multiple) return press.report(value);

    press.onPick?.({ value, on: !press.held.includes(value) });
    press.report(toggled(press.held, press.options, value));
  };

function toggled(
  held: readonly string[],
  options: readonly FieldPickerOption[],
  value: string,
): readonly string[] {
  const next = new Set(held);

  if (!next.delete(value)) next.add(value);

  return options.flatMap((option) =>
    next.has(option.value) ? [option.value] : [],
  );
}

/*
 * The picks a whole draft list comes to against the values held: one per option whose choice differs, in the options'
 * order, for a drawing that reports a list without a press, such as a dialog's OK.
 */
export function picksBetween(
  held: readonly string[],
  options: readonly FieldPickerOption[],
  draft: readonly string[],
): PickReport[] {
  return options.flatMap((option) => {
    const on = draft.includes(option.value);

    return on === held.includes(option.value)
      ? []
      : [{ value: option.value, on }];
  });
}
