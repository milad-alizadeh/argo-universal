import type { ReactNode } from 'react';

// SwiftUI's Form lays an inline Picker's options out as rows of its Section, so the rows are left as they are.
export const expandInlinePickers = (rows: ReactNode[]): ReactNode[] => rows;
