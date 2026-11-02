import { isChoice } from './elicitation-choice-row';
import type { ElicitationEntry } from './elicitation-form-body';

export type FieldSection = {
  entries: ElicitationEntry[];
};

const choiceAt = (
  index: number,
  entries: readonly ElicitationEntry[],
): boolean => {
  const entry = entries[index];

  return entry !== undefined && isChoice(entry.property);
};

/*
 * A field's description is its section's footer, so the section ends there; fields without one share a card. A choice
 * is a section of its own, headed by its title, since its options are rows that would run into its neighbours'.
 */
const startsSection = (
  index: number,
  entries: readonly ElicitationEntry[],
): boolean =>
  index === 0 || endsSection(index - 1, entries) || choiceAt(index, entries);

const endsSection = (
  index: number,
  entries: readonly ElicitationEntry[],
): boolean =>
  Boolean(entries[index]?.property.description) || choiceAt(index, entries);

// The fields as sections: they run on in one until a field has a footer.
export function fieldSections(
  entries: readonly ElicitationEntry[],
): FieldSection[] {
  const starts = entries.flatMap((_, index) =>
    startsSection(index, entries) ? [index] : [],
  );

  return starts.map((start, order) => ({
    entries: entries.slice(start, starts[order + 1]),
  }));
}

export type FieldMeta = Record<
  string,
  { isTouched: boolean; errors: unknown[] } | undefined
>;

type SectionFields = {
  initial: (entry: ElicitationEntry) => boolean;
  entries: readonly ElicitationEntry[];
};

const shown = (
  props: SectionFields,
  entry: ElicitationEntry,
  meta: FieldMeta,
): boolean => meta[entry.key]?.isTouched === true || props.initial(entry);

function fieldError(meta: FieldMeta, key: string): string | undefined {
  const error = meta[key]?.errors[0];

  return typeof error === 'string' ? error : undefined;
}

// A field's error shows once it is touched, or at once for a value the person did not type.
const shownErrors = (props: SectionFields, meta: FieldMeta): string =>
  props.entries
    .map((entry) =>
      shown(props, entry, meta) ? fieldError(meta, entry.key) : undefined,
    )
    .filter(Boolean)
    .join('\n');

// The shown errors stand in for the section's hint as its footer.
export function sectionFooter(
  props: SectionFields,
  meta: FieldMeta,
): string | undefined {
  const errors = shownErrors(props, meta);

  return errors || props.entries.at(-1)?.property.description;
}
