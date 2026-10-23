import type { FieldGroupKitProps } from '../../kit-props';

export type FieldPickerProps = FieldGroupKitProps<'FieldGroup.Picker'>;

/*
 * What a caller writes: a single Picker holds one value and a `multiple` one a list, so a handler takes the value it
 * is given. The schema's echo carries either, so the drawings below read the wider FieldPickerProps.
 */
type Narrowed = Omit<FieldPickerProps, 'value' | 'multiple' | 'onValueChange'>;

export type FieldPickerSingle = Narrowed & {
  multiple?: false;
  value: string;
  onValueChange: (value: string) => void;
};

export type FieldPickerMultiple = Narrowed & {
  multiple: true;
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
};

export type FieldPickerCallerProps = FieldPickerSingle | FieldPickerMultiple;

/*
 * The drawings read the wider props the schema gives: a handler that takes either payload. A caller's narrower
 * handler is never given the other kind, because every drawing reports a string only when `multiple` is not set
 * and a list only when it is.
 */
export function widened(
  props: FieldPickerCallerProps | FieldPickerProps,
): FieldPickerProps {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: `multiple` decides which payload every drawing reports, so a handler is only given its own kind.
  return props as FieldPickerProps;
}

export type FieldPickerOption = FieldPickerProps['options'][number];

// The chosen values as a list, whether the picker holds one value or several.
export const chosenValues = (
  props: Pick<FieldPickerProps, 'value'>,
): readonly string[] =>
  typeof props.value === 'string' ? [props.value] : props.value;

// What the row shows as its value: the chosen labels, in the options' order.
export function choiceSummary(
  props: Pick<FieldPickerProps, 'value' | 'options'>,
): string {
  const chosen = new Set(chosenValues(props));

  return props.options
    .filter((option) => chosen.has(option.value))
    .map((option) => option.label)
    .join(', ');
}

// A choice reports one value, or with `multiple` the whole list in the options' order.
export function choose(
  props: Pick<
    FieldPickerProps,
    'value' | 'options' | 'multiple' | 'onValueChange'
  >,
  value: string,
): void {
  if (!props.multiple) {
    props.onValueChange(value);

    return;
  }

  props.onValueChange(toggled(props, value));
}

export function toggled(
  props: Pick<FieldPickerProps, 'value' | 'options'>,
  value: string,
): readonly string[] {
  const next = new Set(chosenValues(props));

  if (!next.delete(value)) next.add(value);

  return props.options
    .filter((option) => next.has(option.value))
    .map((option) => option.value);
}

export type OptionSection = {
  title: string | undefined;
  options: readonly FieldPickerOption[];
};

// Options sharing a `section` sit together, in the order the sections first appear; options with none stay untitled.
export function optionSections(
  options: readonly FieldPickerOption[],
): OptionSection[] {
  const sections = new Map<string | undefined, FieldPickerOption[]>();

  for (const option of options)
    sections.set(option.section, [
      ...(sections.get(option.section) ?? []),
      option,
    ]);

  return [...sections].map(([title, members]) => ({
    title,
    options: members,
  }));
}

// The options whose label or subtitle contain the query, without regard to case.
export function matchingOptions(
  options: readonly FieldPickerOption[],
  query: string,
): readonly FieldPickerOption[] {
  const needle = query.trim().toLocaleLowerCase();

  return options.filter((option) =>
    `${option.label} ${option.subtitle ?? ''}`
      .toLocaleLowerCase()
      .includes(needle),
  );
}
