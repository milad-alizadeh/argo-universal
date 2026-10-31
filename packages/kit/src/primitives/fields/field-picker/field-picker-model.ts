import type { FieldGroupKitProps } from '../../kit-props';

export type FieldPickerProps = FieldGroupKitProps<'FieldGroup.Picker'> & {
  // What the page says when there are no options at all, such as "No Agents installed"; a search that leaves none says so itself. The App's own: a Plugin's wire has no such prop.
  emptyText?: string;
};

/*
 * What a caller writes: a single Picker holds one value and a `multiple` one a list, so a handler takes the value it
 * is given. The schema's echo carries either, so the drawings read the narrowed PickerProps below.
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

export type FieldPickerOption = FieldPickerProps['options'][number];

/*
 * What a caller's value comes to once: whether the choice is `multiple`, the values held, and `pick`, which a drawing
 * calls with the value a person pressed. A single choice reports that string; a `multiple` one reports the held list
 * with the value toggled, in the options' order.
 */
export type Picking = {
  multiple: boolean;
  held: readonly string[];
  pick: (value: string) => void;
};

// The props every drawing reads: the schema's, with the value narrowed. `onValueChange` reports a payload of the caller's own kind only.
export type PickerProps = FieldPickerProps & Picking;

export function narrowed(
  caller: FieldPickerCallerProps | FieldPickerProps,
): PickerProps {
  const multiple = caller.multiple === true;
  const held = heldOf(caller.value);
  const report = reporterOf(caller);

  return {
    ...caller,
    multiple,
    held,
    onValueChange: report,
    pick: (value) =>
      report(multiple ? toggled(held, caller.options, value) : value),
  };
}

const reporterOf =
  (caller: FieldPickerCallerProps | FieldPickerProps) =>
  (payload: string | readonly string[]): void => {
    reportTo(caller, payload);
  };

const heldOf = (value: string | readonly string[]): readonly string[] =>
  typeof value === 'string' ? [value] : value;

// A wide handler may be given either payload; a caller's own hears only its kind, a string or a list, and the other is dropped.
function reportTo(
  caller: FieldPickerCallerProps | FieldPickerProps,
  payload: string | readonly string[],
): void {
  if (caller.multiple === true) sendList(caller, payload);
  else sendOne(caller, payload);
}

function sendList(
  caller: FieldPickerMultiple | FieldPickerProps,
  payload: string | readonly string[],
): void {
  if (typeof payload !== 'string') caller.onValueChange(payload);
}

function sendOne(
  caller: FieldPickerSingle | FieldPickerProps,
  payload: string | readonly string[],
): void {
  if (typeof payload === 'string') caller.onValueChange(payload);
}

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

// The logo of the chosen option, for a row that leads with it; with several chosen, the first one's.
export function chosenLogo(
  props: Pick<PickerProps, 'held' | 'options'>,
): string | undefined {
  const chosen = new Set(props.held);

  return props.options.find((option) => chosen.has(option.value))?.logo;
}

// What the row shows as its value: the chosen labels, in the options' order.
export function choiceSummary(
  props: Pick<PickerProps, 'held' | 'options' | 'summary'>,
): string {
  if (props.summary !== undefined) return props.summary;

  const chosen = new Set(props.held);

  return props.options
    .filter((option) => chosen.has(option.value))
    .map((option) => option.label)
    .join(', ');
}

export type OptionSection = {
  // Distinct per section, so a section titled '' never shares the untitled one's React key.
  key: string;
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
    key: title === undefined ? 'untitled' : `title:${title}`,
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
