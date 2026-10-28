import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { MoveSection } from './list-move-model';
import type { ListSectionProps } from './list-props';
import { rowIdOf } from './list-row-id';
import { ListSection } from './list-section';

const isSection = (child: ReactNode): child is ReactElement<ListSectionProps> =>
  isValidElement<ListSectionProps>(child) && child.type === ListSection;

// A row moves when it carries an id: a ListItem's own `id`.
const movableId = (child: ReactNode): string | undefined =>
  isSection(child) ? undefined : rowIdOf(child);

const rowIds = (children: readonly ReactNode[]): string[] =>
  children.flatMap((child) => movableId(child) ?? []);

// A move names the Section it lands in, so only rows outside any Section and rows of a Section with an id can move.
const movableSection = (
  child: ReactNode,
): child is ReactElement<ListSectionProps> =>
  isSection(child) && child.props.id !== undefined;

const sectionEntry = ({
  props,
}: ReactElement<ListSectionProps>): MoveSection => ({
  id: props.id,
  title: props.title,
  rows: rowIds(flattenedChildren(props.children)),
});

const startsLoose = (child: ReactNode, loose: readonly string[]): boolean =>
  loose.length > 0 && movableId(child) === loose[0];

// The Section a child opens: a movable Section its own, and the first loose row the loose rows' one.
function sectionsAt(child: ReactNode, loose: string[]): MoveSection[] {
  if (movableSection(child)) return [sectionEntry(child)];

  return startsLoose(child, loose) ? [{ rows: loose }] : [];
}

/*
 * A List's movable rows, Section by Section, as its children declare them. Rows outside any Section form one Section
 * of their own, where the first of them sits; child ListItems nested in a row move with their parent.
 */
export function moveSections(children: ReactNode): MoveSection[] {
  const entries = flattenedChildren(children);
  const loose = rowIds(entries);

  return entries.flatMap((child) => sectionsAt(child, loose));
}

type Rows = ReadonlyMap<string, ReactNode>;

// The order of the Section with `id`; with none, of the rows outside any Section.
const orderOf = (
  sections: readonly MoveSection[],
  id?: string,
): readonly string[] =>
  sections.find((section) => section.id === id)?.rows ?? [];

const refilledSection = (
  child: ReactElement<ListSectionProps>,
  sections: readonly MoveSection[],
  rows: Rows,
): ReactNode =>
  cloneElement(child, {
    children: refilled(
      flattenedChildren(child.props.children),
      orderOf(sections, child.props.id),
      rows,
    ),
  });

// The children with their rows in the given order: each movable child's place takes the next row of its Section.
export function reorderedChildren(
  children: ReactNode,
  sections: readonly MoveSection[],
): ReactNode[] {
  const entries = flattenedChildren(children);
  const rows = rowElements(entries);

  return refilled(entries, orderOf(sections), rows).map((child) =>
    movableSection(child) ? refilledSection(child, sections, rows) : child,
  );
}

const rowsInside = (child: ReactNode): readonly ReactNode[] =>
  movableSection(child) ? flattenedChildren(child.props.children) : [child];

function rowEntry(row: ReactNode): [string, ReactNode][] {
  const id = movableId(row);

  return id === undefined ? [] : [[id, row]];
}

const rowElements = (entries: readonly ReactNode[]): Rows =>
  new Map(entries.flatMap(rowsInside).flatMap(rowEntry));

function refilled(
  children: readonly ReactNode[],
  order: readonly string[],
  rows: Rows,
): ReactNode[] {
  const next = order.flatMap((id) => rows.get(id) ?? []);
  let taken = 0;

  const kept = children.flatMap((child) => {
    if (movableId(child) === undefined) return [child];

    const row = next[taken];

    taken += 1;

    return row === undefined ? [] : [row];
  });

  return [...kept, ...next.slice(taken)];
}
