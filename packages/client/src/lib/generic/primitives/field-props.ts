import type { ReactElement, ReactNode } from 'react';
import type { IconName } from '../symbols/icon-names';

export interface FieldGroupProps {
  children: ReactNode;
  variant?: 'grouped' | 'navigation';
}

export interface FieldSectionProps {
  children: ReactNode;
  title?: string;
  footer?: string;
}

export interface ListItemProps {
  title: string;
  value?: string;
  icon?: IconName;
  accessory?: ReactElement;
  onPress?: () => void;
  href?: string;
  disabled?: boolean;
  selected?: boolean;
  needsAttention?: boolean;
}

export function listItemName(props: ListItemProps): string {
  return [props.title, props.value, props.needsAttention && 'needs attention']
    .filter(Boolean)
    .join(', ');
}
