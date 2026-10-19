import type { ReactElement, ReactNode } from 'react';
import { useSizeClassValue } from '#lib/generic/use-size-class/use-size-class-value';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { Icon } from '#primitives/content/icon';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import type {
  SettingsLayoutItem,
  SettingsLayoutProps,
  SettingsLayoutSection,
  SettingsLayoutSections,
} from './settings-layout-props';

/*
 * Foundations / SettingsLayout: a thin name over ListDetail. Its list is the grouped settings pages, each a link; on a
 * wide window it sits beside the page shown, whose row it marks, and under wide the list pushes each page.
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
  const selected = useWide() ? props.selected : undefined;

  if (!hasPages(sections)) return props.empty;

  return (
    <List appearance="grouped">
      {sections.map((section, index) => (
        <SettingsGroup
          key={section.title ?? index}
          {...{ section, selected, onSelect: props.onSelect }}
        />
      ))}
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
  return (
    <ListItem.Link
      {...row}
      leading={icon && <Icon name={icon} role="row" />}
      selected={id === selected}
      onPress={onSelect && (() => onSelect(row.href))}
    />
  );
}
