import type { ReactNode } from 'react';
import { flatChildren } from '../../../flattened-children';
import type { ListSectionProps } from './list-props';

/*
 * A List's rows and Sections as one flat list of data. A Section is an entry of its own, a header; a row names the
 * Section it sits in by that header's `key`, and a row with no `section` sits outside any Section. Each `key` is unique
 * in the list. The List reads them into its Sections and rows in the order they come, as it reads children.
 */
export type ListEntry<Item> = SectionEntry | RowEntry<Item>;

interface SectionEntry {
  kind: 'section';
  key: string;
  section: Omit<ListSectionProps, 'children'>;
}

interface RowEntry<Item> {
  kind: 'row';
  key: string;
  // What `renderEntry` draws.
  item: Item;
  // The `key` of the Section entry this row is in.
  section?: string;
}

const sectionMark = Symbol('sectionNode');

/*
 * A Section as the nodes it holds: a flat list of its rows' nodes that also carries its own key and props, where a
 * `ListSection` element would carry them as `key` and `props`. The List reads either as one Section.
 */
interface SectionMark {
  key: string;
  props: ListSectionProps;
}

type SectionNode = ReturnType<typeof flatChildren> & {
  [sectionMark]: SectionMark;
};

function sectionNode(
  key: string,
  props: Omit<ListSectionProps, 'children'>,
  rows: ReactNode[],
): SectionNode {
  const nodes = flatChildren(rows);

  return Object.assign(nodes, {
    [sectionMark]: { key, props: { ...props, children: nodes } },
  });
}

const isSectionNode = (node: ReactNode): node is SectionNode =>
  typeof node === 'object' && node !== null && sectionMark in node;

// The key and props of a Section held as nodes; none for any other node.
export const sectionNodeOf = (node: ReactNode): SectionMark | undefined =>
  isSectionNode(node) ? node[sectionMark] : undefined;

// The same Section over other rows, as a search or a loading List keeps some of them.
export function withRows(section: SectionMark, rows: ReactNode[]): ReactNode {
  const { children: _children, ...props } = section.props;

  return sectionNode(section.key, props, rows);
}

// A Section's node, with the rows it holds as they come, held by its key for the rows that name it.
function openSection(
  entry: SectionEntry,
  rowsOf: Map<string, ReactNode[]>,
): ReactNode {
  const rows: ReactNode[] = [];
  rowsOf.set(entry.key, rows);

  return sectionNode(entry.key, entry.section, rows);
}

/*
 * The nodes a List reads for `entries`: each Section holds the rows that name it, and each row is what `renderEntry`
 * draws for it, which carries its own key.
 */
export function entryNodes<Item>(
  entries: readonly ListEntry<Item>[],
  renderEntry: (item: Item, index: number) => ReactNode,
): ReactNode[] {
  const rowsOf = new Map<string, ReactNode[]>();
  const nodes: ReactNode[] = [];

  for (const [index, entry] of entries.entries()) {
    const held =
      entry.kind === 'row' && entry.section !== undefined
        ? rowsOf.get(entry.section)
        : undefined;

    if (entry.kind === 'section') nodes.push(openSection(entry, rowsOf));
    else (held ?? nodes).push(renderEntry(entry.item, index));
  }

  return nodes;
}
