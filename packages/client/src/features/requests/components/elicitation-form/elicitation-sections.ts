import { useStore } from '@tanstack/react-form';
import type { GroupedListSectionProps } from '#primitives/lists/grouped-list-section';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import {
  hasInitialValue,
  type ElicitationEntry,
} from './elicitation-form-body';

export const holdsChoices = (entry: ElicitationEntry): boolean =>
  entry.property.type === 'array';

// A field's description is its section's footer, so the section ends there; several choices stand alone.
const endsSection = (entry: ElicitationEntry): boolean =>
  holdsChoices(entry) || !!entry.property.description;

const startsSection = (
  entry: ElicitationEntry,
  previous: ElicitationEntry | undefined,
): boolean => !previous || endsSection(previous) || holdsChoices(entry);

// The fields as grouped sections: they run on in one until a field has a footer or holds several choices.
export function fieldSections(
  entries: readonly ElicitationEntry[],
): ElicitationEntry[][] {
  const starts = entries.flatMap((entry, index) =>
    startsSection(entry, entries[index - 1]) ? [index] : [],
  );

  return starts.map((start, order) => entries.slice(start, starts[order + 1]));
}

export const requiredLabel = (props: {
  label: string;
  required?: boolean;
}): string => (props.required ? `${props.label} *` : props.label);

// A section of several choices is titled with its field, as its rows are the choices.
export function choicesTitle(
  entries: readonly ElicitationEntry[],
): string | undefined {
  const choices = entries.find(holdsChoices);

  if (!choices) return undefined;

  const label = choices.property.title ?? choices.name;

  return requiredLabel({ label, required: choices.required });
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
const shownError = (
  props: SectionFields,
  entry: ElicitationEntry,
  meta: FieldMeta,
): string | undefined =>
  shown(props, entry, meta) ? fieldError(meta, entry.key) : undefined;

// The first shown error stands in for the section's hint, in the danger tone.
export function useSectionFooter(
  props: SectionFields,
): Pick<GroupedListSectionProps, 'footer' | 'tone'> {
  const error = useStore(props.model.form.store, (state) =>
    props.entries
      .map((entry) => shownError(props, entry, state.fieldMeta))
      .find(Boolean),
  );

  if (error) return { footer: error, tone: 'danger' };

  return { footer: props.entries.at(-1)?.property.description };
}
