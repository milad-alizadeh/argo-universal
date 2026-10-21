import type { ListSectionProps } from '@repo/kit/primitives/lists/list';
import { useStore } from '@tanstack/react-form';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import { fieldLabel } from './elicitation-field-rows';
import {
  hasInitialValue,
  type ElicitationEntry,
} from './elicitation-form-body';
import { elicitationChoices } from './elicitation-property';

type FieldKind = 'choices' | 'switch' | 'text';

export type FieldSection = {
  entries: ElicitationEntry[];
  // A section of choices is headed by its field, as its rows are the choices.
  title?: string;
  // Only fields to type in, kept out of any rows' card.
  textFields: boolean;
};

function fieldKind(entry: ElicitationEntry): FieldKind {
  if (entry.property.type === 'boolean') return 'switch';

  return elicitationChoices(entry.property) ? 'choices' : 'text';
}

// iOS gives each field to type in a section of its own, so it reads as an inset field.
const separateTextFields = true;

const standsAlone = (kind: FieldKind): boolean =>
  kind === 'choices' || (separateTextFields && kind === 'text');

// A field's description is its section's footer, so the section ends there; fields never share rows' cards.
function startsSection(
  entry: ElicitationEntry,
  previous: ElicitationEntry | undefined,
): boolean {
  if (!previous) return true;

  return Boolean(previous.property.description) || kindsSplit(entry, previous);
}

function kindsSplit(
  entry: ElicitationEntry,
  previous: ElicitationEntry,
): boolean {
  const kinds = [fieldKind(entry), fieldKind(previous)];

  return kinds[0] !== kinds[1] || kinds.some(standsAlone);
}

// The fields as grouped sections: they run on in one until a field has a footer or holds choices.
export function fieldSections(
  entries: readonly ElicitationEntry[],
): FieldSection[] {
  const starts = entries.flatMap((entry, index) =>
    startsSection(entry, entries[index - 1]) ? [index] : [],
  );

  return starts.map((start, order) =>
    sectionOf(entries.slice(start, starts[order + 1])),
  );
}

function sectionOf(entries: ElicitationEntry[]): FieldSection {
  return {
    entries,
    title: choicesTitle(entries),
    textFields: entries.every((entry) => fieldKind(entry) === 'text'),
  };
}

const requiredLabel = (label: string, required: boolean): string =>
  required ? `${label} *` : label;

function choicesTitle(entries: ElicitationEntry[]): string | undefined {
  const [first] = entries;

  if (!first || fieldKind(first) !== 'choices') return undefined;

  return requiredLabel(fieldLabel(first), first.required);
}

type FieldMeta = Record<
  string,
  { isTouched: boolean; errors: unknown[] } | undefined
>;

type SectionFields = {
  model: ElicitationModel;
  entries: readonly ElicitationEntry[];
};

const shown = (
  { model }: SectionFields,
  entry: ElicitationEntry,
  meta: FieldMeta,
): boolean =>
  meta[entry.key]?.isTouched === true || hasInitialValue({ model, entry });

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

// The shown errors stand in for the section's hint, in the danger tone.
export function useSectionFooter(
  props: SectionFields,
): Pick<ListSectionProps, 'footer' | 'tone'> {
  const errors = useStore(props.model.form.store, (state) =>
    shownErrors(props, state.fieldMeta),
  );

  if (errors) return { footer: errors, tone: 'danger' };

  return { footer: props.entries.at(-1)?.property.description };
}
