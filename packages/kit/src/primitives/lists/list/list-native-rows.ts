import type { ReactElement, ReactNode } from 'react';
import { nativeSections } from './list-native-sections';

/*
 * The rows a native grouped list can hold: FieldGroup's rows, SwiftUI and Compose views (ADR-0042). FieldGroup marks
 * them, so the List needn't import the fields that import it. The mark sits on each component, so it outlives a
 * reload of this file.
 */
const nativeRowMark = Symbol.for('argo.kit.nativeRow');

export function nativeRows<Rows extends Record<string, object>>(
  rows: Rows,
): Rows {
  for (const row of Object.values(rows))
    Object.defineProperty(row, nativeRowMark, {
      value: true,
      configurable: true,
    });

  return rows;
}

// A host component's type is a string, which carries no mark.
const isNativeRow = ({ type }: ReactElement): boolean =>
  typeof type !== 'string' && nativeRowMark in type;

// A grouped List draws natively when every row it holds is a FieldGroup row; ListItem rows stay on LegendList.
export function holdsNativeRows(children: ReactNode): boolean {
  const rows = nativeSections(children).flatMap((section) => section.rows);

  return rows.length > 0 && rows.every((row) => isNativeRow(row.render()));
}
