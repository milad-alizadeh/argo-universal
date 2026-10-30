import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { listTestIdProps } from '../../../list-test-id';
import { RowHighlightProvider } from '../../../row-highlights';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
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
    <ScrollFadeList
      {...shelfScrollProps(props)}
      data={blocks}
      keyExtractor={blockKey}
      renderItem={shelfRenderer(props)}
    />
  );
}

function blockKey(block: ListBlock): string {
  return block.key;
}

function shelfScrollProps(
  props: ChildDataProps,
): Partial<ScrollFadeListProps<ListBlock>> {
  return {
    maxHeight: props.maxHeight,
    fitHeight: props.fitHeight,
    ...sectionTestId(props.testID),
    ListHeaderComponent: props.header ? <View>{props.header}</View> : undefined,
    ListFooterComponent: (
      <ListEnd footer={props.footer} endContent={props.endContent} />
    ),
  };
}

function shelfRenderer(
  props: ChildDataProps,
): NonNullable<ScrollFadeListProps<ListBlock>['renderItem']> {
  return ({ item }) => (
    <View className="pb-4">
      <SectionShelf props={withoutListEnd(props)} block={item} />
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
  return { ...props, testID: undefined };
}

function hasContent(
  block: Extract<ListBlock, { kind: 'section' }>,
  items: ListChild[],
): boolean {
  return [items.length, block.section.header, block.section.footer].some(
    Boolean,
  );
}

function sectionTestId(
  testID: string | undefined,
): ReturnType<typeof listTestIdProps> | Record<never, never> {
  return testID ? listTestIdProps(testID) : {};
}
