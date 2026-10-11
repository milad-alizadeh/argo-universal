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
  // A spinner replaces the icon while the row's content is on its way.
  loading?: boolean;
  // The title reads as a failure, in the destructive colour.
  destructive?: boolean;
  status?: { tone: 'success' | 'warning' | 'destructive'; label: string };
}

export function listItemName(props: ListItemProps): string {
  return [props.title, props.value, listItemStatus(props)?.label]
    .filter(Boolean)
    .join(', ');
}

export function listItemStatus(
  props: Pick<ListItemProps, 'status' | 'needsAttention'>,
): ListItemProps['status'] {
  return (
    props.status ??
    (props.needsAttention
      ? { tone: 'warning', label: 'needs attention' }
      : undefined)
  );
}
