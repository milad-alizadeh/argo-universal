import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { cn } from '#lib/utils';
import { TextClassContext } from '#primitives/text';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  portalHost,
  children,
  onClosed,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
  onClosed?: () => void;
}) {
  const { open } = PopoverPrimitive.useRootContext();
  const content = (
    <PopoverPrimitive.Content
      data-state={open ? 'open' : 'closed'}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'bg-popover border-border outline-hidden z-50 w-72 rounded-md border p-4 shadow-md shadow-black/5',
        'popover-content cursor-auto',
        className,
      )}
      {...props}
      onCloseAutoFocus={onClosed ?? props.onCloseAutoFocus}
    >
      <TextClassContext.Provider value="text-popover-foreground">
        {children}
      </TextClassContext.Provider>
    </PopoverPrimitive.Content>
  );
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      {content}
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
