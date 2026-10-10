import type { ReactNode } from 'react';
import { useWide } from '../../../lib/generic/use-wide';

export interface SectionRootViewProps {
  // What a phone shows: the section's list.
  phone: ReactNode;
  // What a wide window shows: the section's first page.
  page: ReactNode;
}

// A section root: its list on a phone, and its first page on a wide window.
export function SectionRootView({
  phone,
  page,
}: SectionRootViewProps): ReactNode {
  return useWide() ? page : phone;
}
