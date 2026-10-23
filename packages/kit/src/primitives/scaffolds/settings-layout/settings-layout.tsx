import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSizeClassValue } from '#kit/use-size-class/use-size-class-value';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import { RowDrawingContext } from '../../../row-drawing-context';
import { SectionEndContext } from '../../../section-end-context';
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

// The grouped pages at this Size class and any pinned section, or the caller's empty state when there is neither, as when a search matches none.
function SettingsPages(props: SettingsLayoutProps): ReactNode {
  const sections = useSizeClassValue(props.sections);
  const wide = useWide();

  if (!hasPages(sections) && !props.pinned) return props.empty;

  return <PlacedPages {...props} sections={sections} wide={wide} />;
}

type Placed = Omit<SettingsLayoutProps, 'sections'> & {
  sections: SettingsLayoutSections;
  wide: boolean;
};

/*
 * A wide web sidebar pins the pinned section to its bottom, below the pages' scroll; elsewhere it ends the list.
 * The sidebar's groups then fill the space above its pinned section and scroll there, rather than grow past it.
 */
interface Place {
  end?: ReactNode;
  bottom?: ReactNode;
  fills: boolean;
}

const pinnedPlace = (pinned: ReactNode, sidebar: boolean): Place =>
  sidebar && pinned
    ? { bottom: <PinnedBottom>{pinned}</PinnedBottom>, fills: true }
    : { end: pinned, fills: false };

// Paper's SettingsList: the pinned section ends the sidebar, 12 above its bottom edge, with no section gap after it.
const PinnedBottom = (props: { children: ReactNode }): ReactElement => (
  <SectionEndContext value>{props.children}</SectionEndContext>
);

function PlacedPages({ sections, wide, ...props }: Placed): ReactElement {
  const sidebar = wide && Platform.OS === 'web';
  const place = pinnedPlace(props.pinned, sidebar);
  const selection = pageSelection(props, wide);

  return (
    <SidebarRows shown={sidebar}>
      <SettingsGroups sections={sections} place={place} {...selection} />
      {place.bottom}
    </SidebarRows>
  );
}

type GroupsProps = RowSelection & {
  sections: SettingsLayoutSections;
  place: Place;
};

function SettingsGroups({
  sections,
  place,
  ...rows
}: GroupsProps): ReactElement {
  const groups = sections.map((section, index) => (
    <SettingsGroup key={section.title ?? index} section={section} {...rows} />
  ));

  return (
    <List appearance="plain" fit={!place.fills}>
      {groups}
      {place.end}
    </List>
  );
}

// Only a wide window shows a page beside the list, so only its rows mark one.
const pageSelection = (
  props: Pick<SettingsLayoutProps, 'selected' | 'onSelect'>,
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

const pageRow = { disclosure: true, role: 'link' } as const;

function SettingsPageRow({
  item: { id, icon, ...row },
  selected,
  onSelect,
}: RowSelection & { item: SettingsLayoutItem }): ReactElement {
  return (
    <ListItem
      {...row}
      {...pageRow}
      leading={icon && <Icon name={icon} size="md" />}
      selected={id === selected}
      onPress={onSelect && (() => onSelect(row.href))}
    />
  );
}
