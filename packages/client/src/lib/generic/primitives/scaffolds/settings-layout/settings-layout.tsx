import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSizeClassValue } from '#lib/generic/use-size-class/use-size-class-value';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/content/icon';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import { RowDrawingContext, useInSidebar } from '../../../row-drawing-context';
import type {
  SettingsLayoutItem,
  SettingsLayoutProps,
  SettingsLayoutSection,
  SettingsLayoutSections,
} from './settings-layout-props';

/*
 * Foundations / SettingsLayout: a thin name over ListDetail. Its list is the grouped settings pages, each a link; on a
 * wide window it sits beside the page shown, whose row it marks, and under wide the list pushes each page. A wide web
 * window draws the list as sidebar rows, flat on the glass (Paper's SettingsList).
 */
export function SettingsLayout(props: SettingsLayoutProps): ReactElement {
  return (
    <ListDetail
      testID={props.testID}
      list={<SettingsPages {...props} />}
      detail={props.children}
    />
  );
}

const hasPages = (sections: SettingsLayoutSections): boolean =>
  sections.some((section) => section.items.length > 0);

// The grouped pages at this Size class, or the caller's empty state when no group has one, as when a search matches none.
function SettingsPages(props: SettingsLayoutProps): ReactNode {
  const sections = useSizeClassValue(props.sections);
  const wide = useWide();

  if (!hasPages(sections)) return props.empty;

  return (
    <SidebarRows shown={wide && Platform.OS === 'web'}>
      <SettingsGroups sections={sections} {...pageSelection(props, wide)} />
    </SidebarRows>
  );
}

type GroupsProps = RowSelection & { sections: SettingsLayoutSections };

function SettingsGroups({ sections, ...selection }: GroupsProps): ReactElement {
  return (
    <List appearance="grouped">
      {sections.map((section, index) => (
        <SettingsGroup
          key={section.title ?? index}
          section={section}
          {...selection}
        />
      ))}
    </List>
  );
}

// Only a wide window shows a page beside the list, so only its rows mark one.
const pageSelection = (
  props: SettingsLayoutProps,
  wide: boolean,
): RowSelection => ({
  selected: wide ? props.selected : undefined,
  onSelect: props.onSelect,
});

// Paper's SettingsList: the sidebar holds its rows 8 from its left edge and 14 from its right.
function SidebarRows(props: {
  shown: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <RowDrawingContext value={props.shown ? 'sidebar' : 'kit'}>
      <View className={cn('flex-1', props.shown && 'pb-3 pl-2 pr-3.5')}>
        {props.children}
      </View>
    </RowDrawingContext>
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
        <SettingsPageRow key={item.id} item={item} {...selection} />
      ))}
    </ListSection>
  );
}

function SettingsPageRow({
  item: { id, icon, ...row },
  selected,
  onSelect,
}: RowSelection & { item: SettingsLayoutItem }): ReactElement {
  const shown = id === selected;

  return (
    <ListItem.Link
      {...row}
      leading={icon && <RowIcon name={icon} shown={shown} />}
      selected={shown}
      onPress={onSelect && (() => onSelect(row.href))}
    />
  );
}

type RowIconProps = {
  name: NonNullable<SettingsLayoutItem['icon']>;
  shown: boolean;
};

// Paper's SettingsList: a sidebar row's icon is muted until its page is shown.
function RowIcon({ name, shown }: RowIconProps): ReactElement {
  const muted = useInSidebar() && !shown;

  return (
    <Icon
      name={name}
      role="row"
      className={muted ? 'text-muted-foreground' : undefined}
    />
  );
}
