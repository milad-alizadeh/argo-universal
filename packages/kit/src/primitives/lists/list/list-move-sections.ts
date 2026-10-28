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

/*
 * A List's movable rows, Section by Section, as its children declare them. Rows outside any Section form one Section
 * of their own, where the first of them sits; child ListItems nested in a row move with their parent.
 */
export function moveSections(children: ReactNode): MoveSection[] {
  const entries = flattenedChildren(children);
  const loose = rowIds(entries);
  const sections: MoveSection[] = [];

  for (const child of entries) {
    if (movableSection(child))
      sections.push({
        id: child.props.id,
        title: child.props.title,
        rows: rowIds(flattenedChildren(child.props.children)),
      });
    else if (loose.length > 0 && movableId(child) === loose[0])
      sections.push({ rows: loose });
  }

  return sections;
}

// The children with their rows in the given order: each movable child's place takes the next row of its Section.
export function reorderedChildren(
  children: ReactNode,
  sections: readonly MoveSection[],
): ReactNode[] {
  const entries = flattenedChildren(children);
  const rows = rowElements(entries);
  const order = (id: string | undefined): readonly string[] =>
    sections.find((section) => section.id === id)?.rows ?? [];

  return refilled(entries, order(undefined), rows).map((child) =>
    movableSection(child)
      ? cloneElement(child, {
          children: refilled(
            flattenedChildren(child.props.children),
            order(child.props.id),
            rows,
          ),
        })
      : child,
  );
}

function rowElements(entries: readonly ReactNode[]): Map<string, ReactNode> {
  const rows = new Map<string, ReactNode>();

  for (const child of entries) {
    const inside = movableSection(child)
      ? flattenedChildren(child.props.children)
      : [child];

    for (const row of inside) {
      const id = movableId(row);

      if (id !== undefined) rows.set(id, row);
    }
  }

  return rows;
}

function refilled(
  children: readonly ReactNode[],
  order: readonly string[],
  rows: ReadonlyMap<string, ReactNode>,
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
