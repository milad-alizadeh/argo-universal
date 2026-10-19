import type { ReactElement, ReactNode } from 'react';
import { cn } from '../../../utils';
import { useMarkHighlight, type MarkHighlight } from './list-item-highlight';
import type { DrawingProps } from './list-item-press';

// The row's press class comes from the row, so a radio row draws like its siblings.
type RadioPressProps = {
  row: DrawingProps;
  className?: string;
  children: ReactNode;
};

export function RadioPress(props: RadioPressProps): ReactElement {
  const mark = useMarkHighlight();

  return (
    <button {...radioProps(props.row, props.className)} {...pointerProps(mark)}>
      {props.children}
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
