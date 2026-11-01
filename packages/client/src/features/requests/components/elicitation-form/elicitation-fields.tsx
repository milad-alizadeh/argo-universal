import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useStore } from '@tanstack/react-form';
import type { ComponentProps, ReactElement } from 'react';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import { choicePicker, isChoice } from './elicitation-choice-row';
import {
  rowTitle,
  type ElicitationFieldProps,
} from './elicitation-field-props';
import { FieldRow } from './elicitation-field-rows';
import {
  ElicitationFormField,
  hasInitialValue,
  type ElicitationEntry,
} from './elicitation-form-body';
import {
  fieldSections,
  sectionFooter,
  type FieldMeta,
  type FieldSection,
} from './elicitation-sections';

type ModelProps = { model: ElicitationModel };

// The form's fields on one page: a FieldGroup, its rows grouped in sections that end at a field's description.
export function ElicitationFields({ model }: ModelProps): ReactElement {
  const meta = useStore(model.form.store, (state) => state.fieldMeta);

  // Choices are drawn from the values, so a change redraws them.
  useStore(model.form.store, (state) => state.values);

  return (
    <FieldGroup disabled={model.inactive}>
      {fieldSections(model.schema.fields).map((section) =>
        fieldsSection({ model, section, meta }),
      )}
    </FieldGroup>
  );
}

type SectionProps = ModelProps & { section: FieldSection; meta: FieldMeta };

// Called, not rendered: a FieldGroup reads its sections by element type.
const fieldsSection = (props: SectionProps): ReactElement => (
  <FieldGroup.Section
    key={props.section.entries[0]?.key}
    {...sectionProps(props)}
  >
    {props.section.entries.map((entry) => fieldRow(props.model, entry))}
  </FieldGroup.Section>
);

/*
 * A choice is drawn straight from the form's values, not inside a Field: its options are rows of the Section, which
 * reads a Picker by element type. The form validates as a whole, so no Field is needed to check it.
 */
const sectionProps = ({
  model,
  section,
  meta,
}: SectionProps): ComponentProps<typeof FieldGroup.Section> => ({
  title: sectionTitle(model, section),
  footer: sectionFooter(
    {
      entries: section.entries,
      initial: (entry) => hasInitialValue({ model, entry }),
    },
    meta,
  ),
});

// A section of one choice is headed by the choice's title.
function sectionTitle(
  model: ModelProps['model'],
  section: FieldSection,
): string | undefined {
  const [entry] = section.entries;

  return entry && isChoice(entry.property)
    ? rowTitle(choiceProps(model, entry))
    : undefined;
}

const fieldRow = (
  model: ModelProps['model'],
  entry: ElicitationEntry,
): ReactElement =>
  isChoice(entry.property) ? (
    choicePicker(choiceProps(model, entry))
  ) : (
    <ElicitationFormField key={entry.key} model={model} entry={entry}>
      {(field) => <FieldRow {...field} />}
    </ElicitationFormField>
  );

const noop = (): void => {};

const choiceProps = (
  model: ModelProps['model'],
  entry: ElicitationEntry,
): ElicitationFieldProps => ({
  name: entry.name,
  property: entry.property,
  required: entry.required,
  value: model.form.getFieldValue(entry.key),
  showError: false,
  inactive: model.inactive,
  onChange: (value) => model.form.setFieldValue(entry.key, value),
  onBlur: noop,
});
