import type { ReactNode } from 'react';

// What the picker page draws as a phone's native grouped list: `List.Section`s of FieldGroup rows (ADR-0042).
export type PhoneGroupedProps = { children: ReactNode; empty?: ReactNode };
