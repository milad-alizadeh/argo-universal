import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSizeClassValue } from '#kit/use-size-class/use-size-class-value';
import { useWide } from '#kit/use-wide/use-wide';
import { Icon } from '#primitives/content/icon';
import { FieldGroup } from '#primitives/fields/field-group';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import { SectionEndContext } from '../../../section-end-context';
import { SettingsFieldGroup } from './settings-field-group';
import type {
  SettingsLayoutItem,
  SettingsLayoutProps,
  SettingsLayoutSection,
  SettingsLayoutSections,
} from './settings-layout-props';

/*
 * Foundations / SettingsLayout: a thin name over ListDetail. Its list is the grouped settings pages, each a link; on a
 * wide window it sits beside the page shown, and under wide the list pushes each page. A wide web window draws the
 * list as sidebar rows, flat on the glass, marking the page shown (Paper's SettingsList); everywhere else it is a
 * FieldGroup, as a phone's Settings is (owner, 2026-10-25).
 */
export function SettingsLayout(props: SettingsLayoutProps): ReactElement {
  return (
    <ListDetail
      testID={props.testID}
      screen={props.screen}
      list={<SettingsScreens {...props} />}
      detail={props.children}
    />
  );
}

const hasScreens = (sections: SettingsLayoutSections): boolean =>
  sections.some((section) => section.items.length > 0);

const isEmpty = (
  sections: SettingsLayoutSections,
  lastSection: ReactNode,
): boolean => !hasScreens(sections) && !lastSection;

const sidebarShown = (wide: boolean): boolean => wide && Platform.OS === 'web';

// The grouped pages at this Size class and any last section, or the caller's empty state when there is neither, as when a search matches none.
function SettingsScreens(props: SettingsLayoutProps): ReactNode {
  const sections = useSizeClassValue(props.sections);
  const wide = useWide();

  if (isEmpty(sections, props.lastSection)) return props.empty;

  return sidebarShown(wide) ? (
    <PlacedScreens {...props} sections={sections} />
  ) : (
    <SettingsFieldGroup {...props} sections={sections} />
  );
}

type Placed = Omit<SettingsLayoutProps, 'sections'> & {
  sections: SettingsLayoutSections;
};

/*
 * The wide web sidebar draws its groups as rows and the last section after them, in the same scroll, as a phone's
 * FieldGroup does. A List with no rows draws no end, so a search that leaves only the last section draws it alone.
 */
function PlacedScreens({ sections, ...props }: Placed): ReactElement {
  if (!hasScreens(sections))
    return <LastSection>{props.lastSection}</LastSection>;

  return (
    <SettingsGroups
      sections={sections}
      selected={props.selected}
      onSelect={props.onSelect}
      endContent={
        props.lastSection && <LastSection>{props.lastSection}</LastSection>
      }
    />
  );
}

// A FieldGroup fills its page, so the last section's FieldGroup is given the height of a titled section of one row.
const lastSectionHeight = 'h-32';

const LastSection = (props: { children: ReactNode }): ReactElement => (
  <SectionEndContext value>
    <View className={lastSectionHeight}>
      <FieldGroup>{props.children}</FieldGroup>
    </View>
  </SectionEndContext>
);

type GroupsProps = RowSelection & {
  sections: SettingsLayoutSections;
  endContent?: ReactNode;
};

function SettingsGroups({
  sections,
  endContent,
  ...rows
}: GroupsProps): ReactElement {
  const groups = sections.map((section, index) => (
    <SettingsGroup key={section.title ?? index} section={section} {...rows} />
  ));

  return (
    <List appearance="plain" endContent={endContent}>
      {groups}
    </List>
  );
}

type RowSelection = Pick<SettingsLayoutProps, 'selected' | 'onSelect'>;

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
      leading={icon && <Icon name={icon} size="md" />}
      selected={id === selected}
      onPress={onSelect && (() => onSelect(row.href))}
    />
  );
}
