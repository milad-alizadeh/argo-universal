import type { ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import { OptionRow } from './field-picker-inline-row';
import { optionSections, type OptionSection } from './field-picker-model';
import type { FieldPickerScreenProps } from './field-picker-screen';
import { EmptyState } from './field-picker-screen-parts';

/*
 * The options of a `page` on a phone (ADR-0042): a grouped List, so the page is a native, virtualised list drawn in
 * the look of the FieldGroups around it. Its rows are the inline choice's option rows, each with a mark once chosen
 * (a check on iOS, a radio button or checkbox on Android).
 */
export function ScreenRows(props: FieldPickerScreenProps): ReactElement {
  return (
    <List
      appearance="grouped"
      accessibilityLabel={props.title}
      empty={<EmptyState />}
    >
      {optionSections(props.options).map((section) =>
        screenSection(props, section),
      )}
    </List>
  );
}

/*
 * A plain function, not a component: the List reads its sections off the `List.Section` elements it is given, so a
 * wrapper component in between would be taken for a row.
 */
function screenSection(
  props: FieldPickerScreenProps,
  section: OptionSection,
): ReactElement {
  return (
    <List.Section key={section.title ?? ''} title={section.title}>
      {section.options.map((option) => (
        <OptionRow key={option.value} {...props} option={option} />
      ))}
    </List.Section>
  );
}
