import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../../utils';
import type { DrawingProps } from './list-item-press';
import { itemPress } from './list-item-styles';

export function RadioPress({
  row,
  children,
}: {
  row: DrawingProps;
  children: ReactNode;
}): ReactElement {
  return <button {...radioProps(row)}>{children}</button>;
}

function radioProps(
  row: DrawingProps,
): React.ComponentProps<'button'> & { 'data-testid'?: string } {
  return {
    type: 'button',
    role: 'radio',
    'aria-label': row.accessibilityLabel ?? row.title,
    'aria-checked': !!row.selected,
    disabled: row.disabled,
    onClick: row.onPress,
    className: radioClass(row.disabled),
    'data-testid': row.testID,
  };
}

function radioClass(disabled?: boolean): string {
  return cn('flex w-full text-left', itemPress, disabled && 'opacity-50');
}
