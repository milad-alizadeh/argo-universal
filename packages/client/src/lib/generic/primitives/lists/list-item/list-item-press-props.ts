import type { ComponentProps, KeyboardEventHandler, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { ListItemProps } from './list-item-props';

export interface DrawingProps extends ListItemProps {
  accessory?: ReactNode;
  checked?: boolean;
  content?: ReactNode;
}

export type RowPressProps = ComponentProps<typeof Pressable> &
  Pick<
    ListItemProps,
    'href' | 'aria-haspopup' | 'aria-expanded' | 'aria-controls'
  > & {
    onKeyDown?: KeyboardEventHandler;
    'aria-pressed'?: boolean;
    'aria-current'?: 'page';
  };
