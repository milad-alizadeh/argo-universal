import type { ReactNode } from 'react';
import type { MoveAnswer } from './list-move-order';

// What a native grouped list holds: `List.Section`s of FieldGroup rows (ADR-0042), which move by menu with `onMove`.
export type NativeGroupedProps = {
  children: ReactNode;
  empty?: ReactNode;
  onMove?: MoveAnswer;
};
