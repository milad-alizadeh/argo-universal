import * as PopoverPrimitive from '@rn-primitives/popover';
import type * as React from 'react';
import { createContext, useEffect } from 'react';
export const ControlledPopoverState = createContext<boolean | undefined>(
  undefined,
);
type RootProps = React.ComponentProps<typeof PopoverPrimitive.Root> & {
  open?: boolean;
  openOnHover?: boolean;
};
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
