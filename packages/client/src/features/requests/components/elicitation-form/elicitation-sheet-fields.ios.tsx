import type { ReactElement } from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import {
  ElicitationFormField,
  type ElicitationEntry,
} from './elicitation-form-body';
import { ElicitationRows } from './elicitation-rows';
import {
  choicesTitle,
  fieldSections,
  useSectionFooter,
} from './elicitation-sections';

// SwiftUI's grouped Form scrolls the sections, so the sheet adds no scroller of its own.
export const sheetFieldsScroll = true;

type ModelProps = { model: ElicitationModel };

type SectionProps = ModelProps & {
  entries: ElicitationEntry[];
  title?: string;
};

/*
 * iOS sets the fields as Settings rows in inset-grouped sections, one primitive for every row.
 * The source heads the first section, as the line above the fields does elsewhere.
 */
export function ElicitationSheetFields({ model }: ModelProps): ReactElement {
  return <GroupedList>{sectionsOf(model)}</GroupedList>;
}

function sectionsOf(model: ElicitationModel): ReactElement[] {
  const source = model.props.source && `${model.props.source} asks`;

  return fieldSections(model.schema.fields).map((entries, index) => (
    <FieldSection
      key={entries[0]?.key}
      model={model}
      entries={entries}
      title={sectionTitle(entries, index === 0 ? source : undefined)}
    />
  ));
}

// The first section is headed by the source; a section of several choices also by its field's name.
const sectionTitle = (
  entries: readonly ElicitationEntry[],
  source: string | undefined,
): string | undefined =>
  [source, choicesTitle(entries)].filter(Boolean).join(' · ') || undefined;

function FieldSection(props: SectionProps): ReactElement {
  return (
    <GroupedListSection title={props.title} {...useSectionFooter(props)}>
      {props.entries.map((entry) => (
        <ElicitationFormField key={entry.key} model={props.model} entry={entry}>
          {(field) => <ElicitationRows {...field} />}
        </ElicitationFormField>
      ))}
    </GroupedListSection>
  );
}
