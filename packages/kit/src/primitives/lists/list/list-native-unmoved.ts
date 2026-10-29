import { useEffect } from 'react';
import type { NativeSection } from './list-native-sections';

const rowWithoutIdWarning =
  'List with onMove: a FieldGroup row without an id stays where it is. Give the row an id to let it move.';

const lacksId = (section: NativeSection): boolean =>
  section.rows.some((row) => row.id === undefined);

// Whether any row has no id, so the List cannot move it.
export const missesIds = (sections: readonly NativeSection[]): boolean =>
  sections.some(lacksId);

// A row without an id stays put in a moving native grouped List; a forgotten id is the likelier cause, so development says so.
export function useWarnRowsWithoutIds(
  sections: readonly NativeSection[],
): void {
  const missing = __DEV__ && missesIds(sections);

  useEffect(() => {
    if (missing) console.error(rowWithoutIdWarning);
  }, [missing]);
}
