import type * as React from 'react';
import { useMemo, useRef, type RefObject } from 'react';
import { ListPlaceContext } from '#kit/list-place';
import { List, ListSectionHeader, type ListRef } from '#primitives/lists/list';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { useRevealRow } from './rich-textarea-suggestion-reveal';
import type { SuggestionRow } from './rich-textarea-suggestion-row';

// The desktop's rows are a listbox's options, highlighted from the field while focus stays in it.
interface SuggestionListbox {
  highlighted: number | null;
  onHighlight: (index: number) => void;
}

export interface SuggestionMenuProps {
  rows: readonly SuggestionRow[];
  maxHeight: number;
  onChoose: (index: number) => void;
  listbox?: SuggestionListbox;
}

type RowEntry = { kind: 'row'; key: string; row: SuggestionRow; index: number };

type Entry = { kind: 'title'; key: string; title: string } | RowEntry;

const titleEntry = (row: SuggestionRow): Entry => ({
  kind: 'title',
  key: `header:${row.group}`,
  title: row.groupTitle,
});

// Each group's title heads its rows.
const menuEntries = (rows: readonly SuggestionRow[]): Entry[] =>
  rows.flatMap((row, index) => [
    ...(rows[index - 1]?.group === row.group ? [] : [titleEntry(row)]),
    { kind: 'row' as const, key: row.key, row, index },
  ]);

const highlightedEntry = (
  entries: readonly Entry[],
  listbox: SuggestionListbox | undefined,
): number =>
  entries.findIndex(
    (entry) => entry.kind === 'row' && entry.index === listbox?.highlighted,
  );

function rowRole(
  listbox: SuggestionListbox | undefined,
  index: number,
): Partial<ListItemProps> {
  if (!listbox) return { accessibilityRole: 'button' };

  return {
    role: 'option',
    nativeID: `typeahead-item-${index}`,
    selected: listbox.highlighted === index,
    onHoverIn: () => listbox.onHighlight(index),
  };
}

// One shared row: the type icon, the name, and up to two lines of detail.
function itemProps(
  { row, index }: RowEntry,
  menu: SuggestionMenuProps,
): ListItemProps {
  return {
    title: row.title,
    subtitle: row.subtitle,
    subtitleLines: 2,
    leading: row.leading,
    accessibilityLabel: row.label,
    onPress: () => menu.onChoose(index),
    ...rowRole(menu.listbox, index),
  };
}

const listProps = {
  appearance: 'plain',
  recycleItems: true,
  estimatedItemSize: 56,
  keyboardShouldPersistTaps: 'always',
  keyExtractor: (entry: Entry): string => entry.key,
  getItemType: (entry: Entry): string =>
    entry.kind === 'title' ? 'section' : 'row',
} as const;

const entryDrawing =
  (menu: SuggestionMenuProps) =>
  (entry: Entry): React.JSX.Element =>
    entry.kind === 'title' ? (
      <ListSectionHeader title={entry.title} />
    ) : (
      <ListItem {...itemProps(entry, menu)} />
    );

// The menu's titles and rows, kept with the highlighted row in view.
function useMenuEntries(
  { rows, listbox }: SuggestionMenuProps,
  list: RefObject<ListRef | null>,
): Entry[] {
  const entries = useMemo(() => menuEntries(rows), [rows]);
  useRevealRow(list, entries, highlightedEntry(entries, listbox));

  return entries;
}

/*
 * The `/` and `#` results, on a phone and on the desktop: a virtualized List that draws only the rows in view,
 * however many results match.
 */
export function SuggestionMenu(props: SuggestionMenuProps): React.JSX.Element {
  const list = useRef<ListRef>(null);
  const entries = useMenuEntries(props, list);

  return (
    <ListPlaceContext value="popover">
      <List
        {...listProps}
        ref={list}
        maxHeight={props.maxHeight}
        items={entries}
        renderItem={entryDrawing(props)}
      />
    </ListPlaceContext>
  );
}
