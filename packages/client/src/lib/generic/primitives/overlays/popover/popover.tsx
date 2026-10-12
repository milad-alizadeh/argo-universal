import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { TextClassContext } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';

type ContentProps = React.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalHost?: string;
  onClosed?: () => void;
};
import { Popover } from './popover-root';
const PopoverTrigger = PopoverPrimitive.Trigger;
const contentClassName =
  'bg-popover border-border outline-hidden z-50 w-72 rounded-2xl border p-4 shadow-card popover-content cursor-auto';

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

function namePopoverTarget(
  target: EventTarget | null,
  label: string | undefined,
): void {
  if (!(target instanceof HTMLElement)) return;
  if (label) target.setAttribute('aria-label', label);
}
function nameOpenedPopover(props: ContentProps, event: Event): void {
  namePopoverTarget(event.target, props.accessibilityLabel);
  props.onOpenAutoFocus?.(event);
}

function PopoverBody(props: ContentProps): React.JSX.Element {
  const { open } = PopoverPrimitive.useRootContext();
  const primitiveProps = {
    ...contentProps(props),
    onOpenAutoFocus: (event: Event): void => nameOpenedPopover(props, event),
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
