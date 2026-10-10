import { useRootContext } from '@rn-primitives/popover';
import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useResolveClassNames } from 'uniwind';
import type { ButtonProps } from '#primitives/button';
import { useWide } from '../navigation/use-wide';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { ComposerSheet } from './composer-sheet';

function PopoverPanel({
  children,
  disabled,
  close,
}: {
  children: (close: (after?: () => void) => void) => ReactNode;
  disabled?: boolean;
  close: (after?: () => void) => void;
}): ReactNode {
  const { onOpenChange } = useRootContext();
  useEffect(() => {
    if (disabled) onOpenChange(false);
  }, [disabled, onOpenChange]);
  return children((after) => {
    close(after);
    onOpenChange(false);
  });
}

export function ComposerPopover({
  trigger,
  label,
  width = 280,
  className,
  children,
}: {
  trigger: ReactElement<ButtonProps>;
  label: string;
  width?: number;
  className?: string;
  // `after` runs once the overlay has left the screen, so it may present a system picker.
  children: (close: (after?: () => void) => void) => ReactNode;
}): React.JSX.Element {
  const wide = useWide();
  const layout = useResolveClassNames(className ?? '');
  const [open, setOpen] = useState(false);
  const { close, closed, onOpenChange } = useAfterClose(setOpen);
  if (trigger.props.disabled && open) setOpen(false);
  if (!wide)
    return (
      <ComposerSheet
        style={layout}
        open={open}
        onOpenChange={onOpenChange}
        onClosed={closed}
        trigger={trigger}
        label={label}
      >
        {children(close)}
      </ComposerSheet>
    );
  return (
    <Popover style={layout} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        accessibilityLabel={label}
        onClosed={closed}
        style={{ width }}
        className="composer-popover p-0 rounded-lg overflow-hidden"
      >
        <PopoverPanel disabled={!!trigger.props.disabled} close={close}>
          {children}
        </PopoverPanel>
      </PopoverContent>
    </Popover>
  );
}

function useAfterClose(setOpen: (open: boolean) => void): {
  close: (after?: () => void) => void;
  closed: () => void;
  onOpenChange: (open: boolean) => void;
} {
  const afterClose = useRef<(() => void) | undefined>(undefined);
  return {
    onOpenChange: useCallback(
      (open: boolean): void => {
        if (open) afterClose.current = undefined;
        setOpen(open);
      },
      [setOpen],
    ),
    close: useCallback(
      (after?: () => void): void => {
        afterClose.current = after;
        setOpen(false);
      },
      [setOpen],
    ),
    closed: useCallback((): void => {
      const after = afterClose.current;
      afterClose.current = undefined;
      after?.();
    }, []),
  };
}
