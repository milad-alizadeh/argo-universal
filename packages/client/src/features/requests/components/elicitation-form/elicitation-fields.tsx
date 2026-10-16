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
import { TextFields } from './elicitation-text-fields';

type ModelProps = { model: ElicitationModel };

// The form's fields on one page: rows in grouped sections, and fields to type in apart from them.
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
  const rows = <SectionRows model={model} section={section} />;

  if (section.textFields) return <TextFields {...footer}>{rows}</TextFields>;

  return (
    <GroupedListSection title={section.title} {...footer}>
      {rows}
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
