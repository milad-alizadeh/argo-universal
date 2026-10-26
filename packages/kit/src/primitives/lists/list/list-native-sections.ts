import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ListSectionProps } from './list-props';
import { ListSection } from './list-section';

/*
 * What a native grouped List draws: sections of FieldGroup rows (list-native-props). A row is only a function
 * that makes its element, so the native list mounts the rows near the viewport.
 */
export type NativeRow = { key: string; render: () => ReactElement };

export type NativeSection = {
  key: string;
  title?: string;
  footer?: string;
  rows: NativeRow[];
};

const elementRow = (element: ReactElement, index: number): NativeRow => ({
  key: String(element.key ?? index),
  render: () => element,
});

const rowsOf = (nodes: ReactNode): NativeRow[] =>
  flattenedChildren(nodes).filter(isValidElement).map(elementRow);

const isSection = (child: ReactNode): child is ReactElement<ListSectionProps> =>
  isValidElement(child) && child.type === ListSection;

const startsRun = (child: ReactNode, last: ReactNode[] | undefined): boolean =>
  isSection(child) || last === undefined || isSection(last[0]);

// A Section is a run of its own; the loose rows between Sections make runs of theirs.
function addChild(runs: ReactNode[][], child: ReactNode): ReactNode[][] {
  const last = runs.at(-1);

  if (last !== undefined && !startsRun(child, last)) last.push(child);
  else runs.push([child]);

  return runs;
}

function toSection(run: ReactNode[], index: number): NativeSection {
  const [first] = run;

  if (!isSection(first)) return { key: `rows-${index}`, rows: rowsOf(run) };

  const { title, footer, children } = first.props;

  return {
    key: String(first.key ?? index),
    title,
    footer,
    rows: rowsOf(children),
  };
}

const hasRows = (section: NativeSection): boolean => section.rows.length > 0;

const childSections = (children: ReactNode): NativeSection[] =>
  flattenedChildren(children)
    .reduce<ReactNode[][]>(addChild, [])
    .map(toSection)
    .filter(hasRows);

export const nativeSections = childSections;

export const nativeRowKey = (row: NativeRow): string => row.key;

// The platform's own row height until a row is measured.
export const estimatedNativeRowHeight = 56;
