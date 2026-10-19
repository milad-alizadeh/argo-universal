import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../../utils';
import type { DrawingProps } from './list-item-press';

// The row's press class comes from the row, so a radio row draws like its siblings.
export function RadioPress({
  row,
  className,
  children,
}: {
  row: DrawingProps;
  className?: string;
  children: ReactNode;
}): ReactElement {
  return <button {...radioProps(row, className)}>{children}</button>;
}

function radioProps(
  row: DrawingProps,
  className?: string,
): React.ComponentProps<'button'> & { 'data-testid'?: string } {
  return {
    type: 'button',
    role: 'radio',
    'aria-label': row.accessibilityLabel ?? row.title,
    'aria-checked': !!row.selected,
    disabled: row.disabled,
    onClick: row.onPress,
    className: cn('flex w-full text-left', className),
    'data-testid': row.testID,
  };
}
