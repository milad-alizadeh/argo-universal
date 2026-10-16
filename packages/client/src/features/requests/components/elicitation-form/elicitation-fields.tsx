import type { ReactElement } from 'react';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import { FieldRows } from './elicitation-field-rows';
import { ElicitationFormField } from './elicitation-form-body';
import { ElicitationList } from './elicitation-list';
import {
  fieldSections,
  useSectionFooter,
  type FieldSection,
} from './elicitation-sections';

type ModelProps = { model: ElicitationModel };

// The form's fields on one page, as rows of grouped sections.
export function ElicitationFields({ model }: ModelProps): ReactElement {
  return (
    <ElicitationList>
      {fieldSections(model.schema.fields).map((section) => (
        <FieldsSection
          key={section.entries[0]?.key}
          model={model}
          section={section}
        />
      ))}
    </ElicitationList>
  );
}

function FieldsSection({
  model,
  section,
}: ModelProps & { section: FieldSection }): ReactElement {
  const footer = useSectionFooter({ model, entries: section.entries });

  return (
    <GroupedListSection
      title={section.title}
      textFields={section.textFields}
      {...footer}
    >
      <SectionRows model={model} section={section} />
    </GroupedListSection>
  );
}

function SectionRows({
  model,
  section,
}: ModelProps & { section: FieldSection }): ReactElement[] {
  return section.entries.map((entry) => (
    <ElicitationFormField key={entry.key} model={model} entry={entry}>
      {(field) => <FieldRows {...field} />}
    </ElicitationFormField>
  ));
}
