import type { ReactNode } from 'react';

// What a native grouped list holds: `List.Section`s of FieldGroup rows (ADR-0042).
export type NativeGroupedProps = { children: ReactNode; empty?: ReactNode };
