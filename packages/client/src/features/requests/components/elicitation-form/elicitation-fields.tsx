import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useStore } from '@tanstack/react-form';
import type { ReactElement } from 'react';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
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
function fieldsSection({ model, section, meta }: SectionProps): ReactElement {
  const footer = sectionFooter(
    {
      entries: section.entries,
      initial: (entry) => hasInitialValue({ model, entry }),
    },
    meta,
  );

  return (
    <FieldGroup.Section key={section.entries[0]?.key} footer={footer}>
      {section.entries.map((entry) => fieldRow(model, entry))}
    </FieldGroup.Section>
  );
}

const fieldRow = (
  model: ModelProps['model'],
  entry: ElicitationEntry,
): ReactElement => (
  <ElicitationFormField key={entry.key} model={model} entry={entry}>
    {(field) => <FieldRow {...field} />}
  </ElicitationFormField>
);
