import { List as SwiftList, Section } from '@expo/ui/swift-ui';
import {
  listStyle,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { PhoneGroupedFrame } from './list-phone-host';
import {
  estimatedPhoneRowHeight,
  phoneRowKey,
  type PhoneRow,
  type PhoneSection,
} from './list-phone-sections';
import type { ListProps } from './list-props';

export const phoneGrouped = true;

// No background of its own, so the page's shows between the section cards, as the FieldGroup's Form does.
const modifiers = [
  listStyle('insetGrouped'),
  scrollContentBackground('hidden'),
];

/*
 * ADR-0042: a grouped List on iOS is SwiftUI's `List` (inset grouped) of `Section`s, each section's rows a
 * `List.ForEach` Expo recycles, so a long list mounts only the rows near the screen. Its rows are FieldGroup rows,
 * SwiftUI views, as in a FieldGroup; React Native content cannot sit in it.
 */
export function PhoneGroupedList<Item>(props: ListProps<Item>): ReactNode {
  return <PhoneGroupedFrame list={props}>{groupedList}</PhoneGroupedFrame>;
}

const groupedList = (sections: PhoneSection[]): ReactElement => (
  <SwiftList modifiers={modifiers}>
    {sections.map((section) => (
      <GroupedSection key={section.key} section={section} />
    ))}
  </SwiftList>
);

const renderRow = ({ item }: { item: PhoneRow }): ReactElement => item.render();

function GroupedSection({ section }: { section: PhoneSection }): ReactElement {
  return (
    <Section header={heading(section.title)} footer={footnote(section.footer)}>
      <SwiftList.ForEach
        data={section.rows}
        keyExtractor={phoneRowKey}
        estimatedItemSize={estimatedPhoneRowHeight}
      >
        {renderRow}
      </SwiftList.ForEach>
    </Section>
  );
}

const headingRole = 'heading';

// The FieldGroup's own title and footer drawing (field-group-section.tsx), as the Section's header and footer.
const heading = (title: string | undefined): ReactElement | undefined =>
  title ? <NativeText role={headingRole}>{title}</NativeText> : undefined;

const footnote = (footer: string | undefined): ReactElement | undefined =>
  footer ? (
    <NativeText role="secondary" tone="muted">
      {footer}
    </NativeText>
  ) : undefined;
