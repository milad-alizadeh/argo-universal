import * as PopoverPrimitive from '@rn-primitives/popover';
import type * as React from 'react';
import { createContext, useEffect } from 'react';
import type { PopoverProps } from './popover-props';

export const ControlledPopoverState = createContext<boolean | undefined>(
  undefined,
);

type RootProps = PopoverProps;

export function Popover({
  open,
  openOnHover: _openOnHover,
  children,
  ...props
}: RootProps): React.JSX.Element {
  return (
    <ControlledPopoverState.Provider value={open}>
      <PopoverPrimitive.Root {...props}>
        <ControlledPopover open={open} />
        {children}
      </PopoverPrimitive.Root>
    </ControlledPopoverState.Provider>
  );
}

function ControlledPopover({ open }: Pick<RootProps, 'open'>): null {
  const context = PopoverPrimitive.useRootContext();
  useEffect(() => {
    if (open !== undefined && context.open !== open) context.onOpenChange(open);
  }, [open, context]);

  return null;
}
