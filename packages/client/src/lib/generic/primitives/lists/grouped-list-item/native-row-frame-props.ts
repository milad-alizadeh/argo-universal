import type { ColumnProps } from '@expo/ui';
import type { ReactNode } from 'react';
import type { ResolvedItemProps } from './grouped-list-item-props';

export interface NativeRowFrameProps {
  item: ResolvedItemProps;
  modifiers: NonNullable<ColumnProps['modifiers']>;
  children: ReactNode;
}
