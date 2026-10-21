import type { ReactElement } from 'react';
import { ListItem } from './list-item';

export interface LoadingRow {
  /*
   * The row's placeholder words. They are never shown: a loading row draws a bar as wide as the text it
   * stands in for, so what is written here is a width, and rows of differing widths read as a list.
   */
  title: string;
  subtitle?: string;
  meta?: string;
  // Whether the row's leading lane holds an icon. Most lists' rows do.
  icon?: boolean;
}

// A row whose lane is empty leaves the lane out; any other value draws the icon's place.
const leadingOf = (row: LoadingRow): null | undefined =>
  row.icon === false ? undefined : null;

/*
 * The rows a list draws before it has any: as many as it usually holds, in the shape its rows take. A list
 * that stands in for itself keeps the reader where they were, which an empty page or a spinner does not.
 */
export const loadingRows = (rows: readonly LoadingRow[]): ReactElement[] =>
  rows.map((row) => (
    <ListItem
      key={row.title}
      isLoading
      title={row.title}
      subtitle={row.subtitle}
      meta={row.meta}
      leading={leadingOf(row)}
    />
  ));
