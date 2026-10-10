export type KeyedRow<T> = { key: string; index: number; value: T };

/**
 * Entries are plain strings or objects without an id, and the form binds each field by its
 * position (`args[0]`), so a row is identified by that position.
 */
export const keyedRows = <T>(values: readonly T[]): KeyedRow<T>[] =>
  values.map((value, index) => ({ key: `row-${index}`, index, value }));
