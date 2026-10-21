import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { RowHighlightProvider } from '../../../row-highlights';
import type { ListChild } from './list-children';
import { ListEnd } from './list-scroll-props';
import type { TileListProps } from './list-tile-props';
import { ListTiles } from './list-tiles';

export type ChildDataProps = Extract<
  TileListProps<ListChild>,
  { items: readonly ListChild[] }
>;

interface ShelfSection {
  key: string;
  header?: ReactNode;
  footer?: ReactNode;
  items: ListChild[];
}

// Section structure stays above/below its own shelf, outside the horizontal scroller.
export function SectionShelves(props: ChildDataProps): ReactElement {
  return (
    <View className="min-w-0 gap-4">
      {props.header}
      {shelfSections(props.items ?? []).map((section) => (
        <SectionShelf
          key={section.key}
          props={withoutListEnd(props)}
          section={section}
        />
      ))}
      <ListEnd footer={props.footer} endContent={props.endContent} />
    </View>
  );
}

interface SectionShelfProps {
  props: ChildDataProps;
  section: ShelfSection;
}

function SectionShelf({ props, section }: SectionShelfProps): ReactElement {
  return (
    <View>
      <SectionTiles props={props} section={section} />
      {section.footer}
    </View>
  );
}

function SectionTiles({ props, section }: SectionShelfProps): ReactNode {
  if (section.items.length === 0) return section.header;

  return (
    <RowHighlightProvider>
      <ListTiles {...props} items={section.items} header={section.header} />
    </RowHighlightProvider>
  );
}

function shelfSections(items: readonly ListChild[]): ShelfSection[] {
  const sections: ShelfSection[] = [];
  let section: ShelfSection = { key: 'unsectioned', items: [] };

  for (const item of items) {
    if (startsSection(item, section)) {
      sections.push(section);
      section = { key: item.key, items: [] };
    }

    appendEntry(section, item);
  }

  return [...sections, section].filter(hasContent);
}

function startsSection(item: ListChild, section: ShelfSection): boolean {
  return (
    Boolean(item.structure && item.structure !== 'footer') &&
    hasContent(section)
  );
}

function hasContent(section: ShelfSection): boolean {
  return Boolean(section.items.length || section.header || section.footer);
}

function appendEntry(section: ShelfSection, item: ListChild): void {
  if (item.structure === 'header') section.header = item.content;
  else appendBody(section, item);
}

function appendBody(section: ShelfSection, item: ListChild): void {
  if (item.structure === 'footer') section.footer = item.content;
  else if (!item.structure) section.items.push(item);
}

function withoutListEnd({
  footer: _footer,
  endContent: _end,
  ...props
}: ChildDataProps): ChildDataProps {
  return props;
}
