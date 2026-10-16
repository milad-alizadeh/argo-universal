import type { ReactElement } from 'react';
import { View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import {
  ElicitationFormField,
  ElicitationHeading,
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
 * The message heads them, as the sheet's title names only the source.
 */
export function ElicitationSheetFields({ model }: ModelProps): ReactElement {
  return (
    <View className="flex-1">
      <View className="px-4 pt-4">
        <ElicitationHeading
          source={model.props.source}
          message={model.props.request.message}
        />
      </View>
      <GroupedList>{sectionsOf(model)}</GroupedList>
    </View>
  );
}

// A section of several choices is headed by its field's name.
function sectionsOf(model: ElicitationModel): ReactElement[] {
  return fieldSections(model.schema.fields).map((entries) => (
    <FieldSection
      key={entries[0]?.key}
      model={model}
      entries={entries}
      title={choicesTitle(entries)}
    />
  ));
}

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
