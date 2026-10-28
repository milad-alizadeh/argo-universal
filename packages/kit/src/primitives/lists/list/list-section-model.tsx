import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import { listPosition } from '../../../list-context';
import type { ListChild } from './list-children';
import type { ListSectionProps } from './list-props';
import { ListSection } from './list-section';
import { prepareSection, type SectionState } from './list-section-state';
import {
  holdsTree,
  topLevel,
  treeChildren,
  type TreeChild,
  type TreeFolding,
} from './list-tree-rows';

export type ListBlock = ItemBlock | SectionBlock;

interface ItemBlock {
  key: string;
  kind: 'items';
  items: ListChild[];
}

interface SectionBlock {
  key: string;
  kind: 'section';
  section: SectionState;
  blocks: ListBlock[];
}

// How a List's rows fold, and whether it holds a tree at all; a List without one draws its children as they are.
export interface ListTree {
  folding: TreeFolding;
  holds: boolean;
  // A section's footer is drawn; Android puts the description on the row instead.
  footerShown: boolean;
}

const sectionChildren = (child: ReactNode): ReactNode[] | undefined =>
  isSection(child) ? flattenedChildren(child.props.children) : undefined;

export function listTree(
  children: ReactNode,
  folding: TreeFolding,
  footerShown: boolean,
): ListTree {
  return {
    folding,
    footerShown,
    holds: holdsTree(flattenedChildren(children), sectionChildren),
  };
}

// A List's children in order, each child ListItem lifted to a row of its own after its parent.
function treeEntries(
  children: ReactNode,
  prefix: string,
  tree: ListTree,
): TreeChild[] {
  const entries = flattenedChildren(children);

  if (!tree.holds)
    return entries.map((child, index) => ({
      child,
      key: `${prefix}/${isValidElement(child) ? child.key : index}`,
      content: child,
    }));

  return treeChildren(entries, tree.folding, topLevel(prefix, isSection));
}

// A child in its List's order: the node itself, and the entry the List draws for it.
interface PlacedChild {
  child: ReactNode;
  entry: ListChild;
}

export function prepareChildren(
  children: ReactNode,
  prefix: string,
  tree: ListTree,
): ListBlock[] {
  const blocks: ListBlock[] = [];
  const entries = treeEntries(children, prefix, tree);

  for (const [index, entry] of entries.entries())
    appendChild(blocks, placedChild(entry, index, entries.length), tree);

  return blocks;
}

function isSection(child: ReactNode): child is ReactElement<ListSectionProps> {
  return isValidElement<ListSectionProps>(child) && child.type === ListSection;
}

function appendChild(
  blocks: ListBlock[],
  { child, entry }: PlacedChild,
  tree: ListTree,
): void {
  if (isSection(child)) blocks.push(sectionBlock(child, entry.key, tree));
  else appendItem(blocks, entry);
}

function sectionBlock(
  child: ReactElement<ListSectionProps>,
  key: string,
  tree: ListTree,
): SectionBlock {
  const section = prepareSection(child.props, key, tree.footerShown);

  return {
    key,
    kind: 'section',
    section,
    blocks: prepareChildren(section.children, key, tree),
  };
}

function appendItem(blocks: ListBlock[], entry: ListChild): void {
  const previous = blocks.at(-1);

  if (previous?.kind === 'items') previous.items.push(entry);
  else
    blocks.push({
      key: looseRunKey(previous),
      kind: 'items',
      items: [entry],
    });
}

function placedChild(
  { child, key, content }: TreeChild,
  index: number,
  count: number,
): PlacedChild {
  return {
    child,
    entry: {
      key,
      content,
      position: listPosition(index === 0, index === count - 1),
    },
  };
}

function looseRunKey(previous: ListBlock | undefined): string {
  return `${previous?.key ?? 'start'}:items`;
}
