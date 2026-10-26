import type { ReactElement } from 'react';

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

// Only a component can carry the mark: a host component's type is a string, and Suspense or StrictMode a symbol.
const isMarkable = (type: unknown): type is object =>
  typeof type === 'function' || (typeof type === 'object' && type !== null);

export const isNativeRow = ({ type }: ReactElement): boolean =>
  isMarkable(type) && nativeRowMark in type;
