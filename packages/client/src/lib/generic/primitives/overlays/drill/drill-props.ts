import type { ReactElement, ReactNode } from 'react';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';

export interface DrillProps extends Pick<
  GroupedListItemProps,
  'label' | 'value' | 'valueLeading' | 'disabled'
> {
  title: string;
  trigger?: ReactElement<{ disabled?: boolean; onPress?: () => void }>;
  contentScrolls?: boolean;
  onClose?: () => void;
  children: (close: () => void) => ReactNode;
}
