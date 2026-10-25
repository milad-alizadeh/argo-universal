const kinds = new Set<unknown>();

// The row components a phone's native grouped List can host (list-phone-rows). Each registers where it is defined.
export const nativeRowKinds: ReadonlySet<unknown> = kinds;

export function registerNativeRows(rows: Iterable<unknown>): void {
  for (const row of rows) kinds.add(row);
}
