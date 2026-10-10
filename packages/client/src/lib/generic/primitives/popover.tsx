import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';

type ContentProps = React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
  onClosed?: () => void;
};
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const contentClassName =
  'bg-popover border-border outline-hidden z-50 w-72 rounded-md border p-4 shadow-md shadow-black/5 popover-content cursor-auto';

function contentPlacement({
  align = 'center',
  sideOffset = 4,
}: ContentProps): Pick<ContentProps, 'align' | 'sideOffset'> {
  return { align, sideOffset };
}

function contentProps({
  onClosed,
  ...props
}: ContentProps): React.ComponentProps<typeof PopoverPrimitive.Content> {
  return {
    ...props,
    ...contentPlacement(props),
    className: cn(contentClassName, props.className),
    onCloseAutoFocus: onClosed ?? props.onCloseAutoFocus,
  };
}

function PopoverBody(props: ContentProps): React.JSX.Element {
  const { open } = PopoverPrimitive.useRootContext();
  const primitiveProps = {
    ...contentProps(props),
    'data-state': open ? 'open' : 'closed',
  };
  return React.createElement(
    PopoverPrimitive.Content,
    primitiveProps,
    <TextClassContext.Provider value="text-popover-foreground">
      {props.children}
    </TextClassContext.Provider>,
  );
}

function PopoverContent({
  portalHost,
  ...props
}: ContentProps): React.JSX.Element {
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <PopoverBody {...props} />
    </PopoverPrimitive.Portal>
  );
}
export { Popover, PopoverContent, PopoverTrigger };
