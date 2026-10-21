import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { RowHighlightProvider } from '../../../row-highlights';
import type { ListChild } from './list-children';
import { ListEnd } from './list-scroll-props';
import { sectionItems } from './list-section-entries';
import type { ListBlock } from './list-section-model';
import type { TileListProps } from './list-tile-props';
import { ListTiles } from './list-tiles';

export type ChildDataProps = Extract<
  TileListProps<ListChild>,
  { items: readonly ListChild[] }
>;

// Explicit sections and consecutive loose items each retain their own shelf.
export function SectionShelves({
  blocks,
  ...props
}: ChildDataProps & { blocks: ListBlock[] }): ReactElement {
  return (
    <View className="min-w-0 gap-4">
      {props.header}
      {shelfContents(props, blocks)}
      <ListEnd footer={props.footer} endContent={props.endContent} />
    </View>
  );
}

function SectionShelf({
  props,
  block,
}: {
  props: ChildDataProps;
  block: ListBlock;
}): ReactNode {
  if (block.kind === 'items')
    return <SectionTiles {...props} items={block.items} header={undefined} />;

  return <SectionGroup props={props} block={block} />;
}

interface SectionGroupProps {
  props: ChildDataProps;
  block: Extract<ListBlock, { kind: 'section' }>;
}

function SectionGroup({ props, block }: SectionGroupProps): ReactNode {
  const items = sectionItems(block.blocks, block.section);

  if (!hasContent(block, items)) return null;

  return (
    <View>
      <SectionTiles {...props} items={items} header={block.section.header} />
      {block.section.footer}
    </View>
  );
}

function SectionTiles(props: ChildDataProps): ReactNode {
  if (props.items.length === 0) return props.header;

  return (
    <RowHighlightProvider>
      <ListTiles {...props} />
    </RowHighlightProvider>
  );
}

function withoutListEnd({
  footer: _footer,
  endContent: _end,
  ...props
}: ChildDataProps): ChildDataProps {
  return props;
}

function shelfContents(props: ChildDataProps, blocks: ListBlock[]): ReactNode {
  return blocks.map((block) => (
    <SectionShelf key={block.key} props={withoutListEnd(props)} block={block} />
  ));
}

function hasContent(
  block: Extract<ListBlock, { kind: 'section' }>,
  items: ListChild[],
): boolean {
  return [items.length, block.section.header, block.section.footer].some(
    Boolean,
  );
}
