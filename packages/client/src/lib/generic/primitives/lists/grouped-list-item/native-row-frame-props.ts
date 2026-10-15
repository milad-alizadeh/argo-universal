import type { ColumnProps } from '@expo/ui';
import type { ReactNode } from 'react';
import type { GroupedListItemProps } from './grouped-list-item-props';

export interface NativeRowFrameProps {
  item: GroupedListItemProps;
  modifiers: NonNullable<ColumnProps['modifiers']>;
  children: ReactNode;
}
