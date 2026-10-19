import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../../utils';
import { useMarkHighlight, type MarkHighlight } from './list-item-highlight';
import type { DrawingProps } from './list-item-press';
import { itemPress } from './list-item-styles';

export function RadioPress({
  row,
  children,
}: {
  row: DrawingProps;
  children: ReactNode;
}): ReactElement {
  const mark = useMarkHighlight();

  return (
    <button {...radioProps(row)} {...pointerProps(mark)}>
      {children}
    </button>
  );
}

// A plain button has no Pressable hover or press, so its pointer events mark the row instead.
function pointerProps(mark: MarkHighlight): React.ComponentProps<'button'> {
  return {
    onPointerEnter: () => mark('hover', true),
    onPointerLeave: () => {
      mark('hover', false);
      mark('press', false);
    },
    onPointerDown: () => mark('press', true),
    onPointerUp: () => mark('press', false),
  };
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
