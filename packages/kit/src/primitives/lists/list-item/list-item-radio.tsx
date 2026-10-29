import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../../utils';
import type { DrawingProps } from './list-item-press';
import { ItemContentSlots } from './list-item-slots';
import { useRowFocus } from './use-row-focus';

// The row's press class comes from the row, so a radio row draws like its siblings.
type RadioPressProps = {
  row: DrawingProps;
  className?: string;
  children: ReactNode;
};

function RadioPress(props: RadioPressProps): ReactElement {
  const focus = useRowFocus();

  return (
    <button
      {...radioProps(props.row, cn(props.className, focus.className))}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
    >
      {props.children}
    </button>
  );
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

export function RadioRow({
  row,
  className,
}: {
  row: DrawingProps;
  className?: string;
}): ReactElement {
  return (
    <RadioPress row={row} className={className}>
      <ItemContentSlots {...row} />
    </RadioPress>
  );
}
