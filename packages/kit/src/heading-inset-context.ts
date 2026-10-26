import { createContext } from 'react';
import type { ColumnClaims } from './column-claims';

export interface HeadingInset extends ColumnClaims {
  grouped: boolean;
  register: (grouped: boolean) => void;
}

// Set by a Screen around its heading and content; a FieldGroup or a sheet clears it for what it holds, so nothing nested in one tells the Screen again.
export const HeadingInsetContext = createContext<HeadingInset | undefined>(
  undefined,
);
