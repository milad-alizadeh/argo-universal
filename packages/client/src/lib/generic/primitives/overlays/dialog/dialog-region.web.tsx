import * as DialogPrimitive from '@rn-primitives/dialog';
import type { ComponentProps, ReactElement } from 'react';
import { useId } from 'react';
import { Portal } from '../portal/portal';
import type { DialogRegionProps as RegionProps } from './dialog-region.types';

const regionInset = 24;
const regionClass =
  'absolute inset-6 z-50 [&>[role=dialog]]:flex [&>[role=dialog]]:flex-1 [&>[role=dialog]]:min-h-0 [&>[role=dialog]]:outline-none';

export function DialogRegion(props: RegionProps): ReactElement {
  return (
    <Portal hostName={props.hostName} name={useId()}>
      <DialogPrimitive.Root {...regionRootProps(props)}>
        {regionContent(props)}
      </DialogPrimitive.Root>
    </Portal>
  );
}

function regionContent(props: RegionProps): ReactElement {
  return (
    <DialogPrimitive.Content {...regionContentProps}>
      <DialogPrimitive.Title className="sr-only">
        {props.label}
      </DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">
        {props.description}
      </DialogPrimitive.Description>
      {props.children}
    </DialogPrimitive.Content>
  );
}

function regionRootProps(
  props: RegionProps,
): ComponentProps<typeof DialogPrimitive.Root> {
  return {
    open: true,
    onOpenChange: (open): void => {
      if (!open) props.onClose();
    },
    className: regionClass,
    style:
      props.bottomInset === undefined
        ? undefined
        : { bottom: props.bottomInset + regionInset },
  };
}

const regionContentProps = {
  className: 'flex-1 min-h-0',
  onEscapeKeyDown: (event: { preventDefault: () => void }): void =>
    event.preventDefault(),
};
