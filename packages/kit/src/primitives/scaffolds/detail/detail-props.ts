import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

export type DetailProps = KitProps<'Detail'> & { testID?: string };

export interface DetailColumnsProps {
  metadata?: ReactNode;
  children: ReactNode;
}
