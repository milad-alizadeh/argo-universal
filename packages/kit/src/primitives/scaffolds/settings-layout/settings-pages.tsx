import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import { ListPlaceContext } from '#kit/list-place';
import { useSizeClassValue } from '#kit/use-size-class/use-size-class-value';
import { useWide } from '#kit/use-wide/use-wide';
import { Icon } from '#primitives/content/icon';
import { FieldGroup } from '#primitives/fields/field-group';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { SidebarRows } from '../list-detail/sidebar-rows';
import { SettingsFieldGroup } from './settings-field-group';
import type {
  SettingsLayoutItem,
  SettingsLayoutSection,
  SettingsLayoutSections,
  SettingsPagesProps,
} from './settings-layout-props';
import { sidebarChoices } from './settings-sidebar-choices';

/*
 * Settings' pages as a list alone, with no page beside it: a wide web window draws the groups as sidebar rows, flat on
 * the glass, marking the page shown; everywhere else they are a FieldGroup, as a phone's
 * Settings is (owner, 2026-10-25). Where the list sits, under which Screen, and what shows beside it are the caller's.
 */
export function SettingsPages(props: SettingsPagesProps): ReactNode {
  const sections = useSizeClassValue(props.sections);
  const placed = sidebarShown(useWide());
  const pages = <Pages {...props} sections={sections} placed={placed} />;

  return placed ? <SidebarRows>{pages}</SidebarRows> : pages;
}

type PagesProps = Omit<SettingsPagesProps, 'sections'> & {
  sections: SettingsLayoutSections;
  placed: boolean;
};

// The grouped pages at this Size class and any last section, or the caller's empty state when there is neither, as when a search matches none.
function Pages({ placed, ...props }: PagesProps): ReactNode {
  if (isEmpty(props.sections, props.lastSection)) return props.empty;

  return placed ? (
    <PlacedScreens {...props} />
  ) : (
    <SettingsFieldGroup {...props} />
  );
}

const hasScreens = (sections: SettingsLayoutSections): boolean =>
  sections.some((section) => section.items.length > 0);

const isEmpty = (
  sections: SettingsLayoutSections,
  lastSection: ReactNode,
): boolean => !hasScreens(sections) && !lastSection;

const sidebarShown = (wide: boolean): boolean => wide && Platform.OS === 'web';

type Placed = Omit<SettingsPagesProps, 'sections'> & {
  sections: SettingsLayoutSections;
};

/*
 * The wide web sidebar draws its groups as rows and the last section after them, in the same scroll, as a phone's
 * FieldGroup does: a section of choices as one more group of rows, any other after the List's end. A List with no rows
 * draws no end, so a search that leaves only such a section draws it alone.
 */
function PlacedScreens({
  sections,
  lastSection,
  ...props
}: Placed): ReactElement {
  const choices = sidebarChoices(lastSection);

  if (!choices && !hasScreens(sections))
    return <LastSection>{lastSection}</LastSection>;

  return (
    <List appearance="plain" endContent={afterGroups(choices, lastSection)}>
      {settingsGroups(sections, props)}
      {choices}
    </List>
  );
}

const afterGroups = (choices: ReactNode, lastSection: ReactNode): ReactNode =>
  choices || !lastSection ? undefined : (
    <LastSection>{lastSection}</LastSection>
  );

// The last section's rows are tiles flat on the glass, as the groups' rows above it are, with no card of their own.
const LastSection = (props: { children: ReactNode }): ReactElement => (
  <ListPlaceContext value="sidebar-end">
    <FieldGroup>{props.children}</FieldGroup>
  </ListPlaceContext>
);

const settingsGroups = (
  sections: SettingsLayoutSections,
  rows: RowSelection,
): ReactElement[] =>
  sections.map((section, index) => (
    <SettingsGroup
      key={section.title ?? index}
      section={section}
      selected={rows.selected}
      onSelect={rows.onSelect}
    />
  ));

type RowSelection = Pick<SettingsPagesProps, 'selected' | 'onSelect'>;

function SettingsGroup({
  section,
  ...selection
}: RowSelection & { section: SettingsLayoutSection }): ReactElement {
  return (
    <ListSection title={section.title}>
      {section.items.map((item) => (
        <SettingsScreenRow key={item.id} item={item} {...selection} />
      ))}
    </ListSection>
  );
}

const screenRow = { disclosure: true, role: 'link' } as const;

function SettingsScreenRow({
  item: { id, icon, ...row },
  selected,
  onSelect,
}: RowSelection & { item: SettingsLayoutItem }): ReactElement {
  return (
    <ListItem
      {...row}
      {...screenRow}
      leading={icon && <Icon name={icon} />}
      selected={id === selected}
      onPress={onSelect && (() => onSelect(row.href))}
    />
  );
}
