import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { useId } from 'react';
import {
  CentredModalDescription,
  CentredModalFrame,
  CentredModalTitle,
} from '#primitives/overlays/centred-overlay';
import { Portal } from '#primitives/overlays/portal';
import type { DialogRegionProps as RegionProps } from './dialog-props';
import { DialogRoot } from './dialog-root';

const regionInset = 24;

const regionClass =
  'absolute inset-6 z-50 [&>[role=dialog]]:flex [&>[role=dialog]]:flex-1 [&>[role=dialog]]:min-h-0';

export function DialogRegion(props: RegionProps): ReactElement {
  return (
    <Portal hostName={props.hostName} name={useId()}>
      <DialogRoot {...regionRootProps(props)}>
        {regionContent(props)}
      </DialogRoot>
    </Portal>
  );
}

// A region's content owns its place, so Escape never closes it.
function regionContent(props: RegionProps): ReactElement {
  return (
    <CentredModalFrame className="flex-1 min-h-0" dismissible={false}>
      <CentredModalTitle className="sr-only">{props.label}</CentredModalTitle>
      <CentredModalDescription className="sr-only">
        {props.description}
      </CentredModalDescription>
      {props.children}
    </CentredModalFrame>
  );
}

type RootProps = Omit<ComponentProps<typeof DialogRoot>, 'children'>;

function regionRootProps(props: RegionProps): RootProps {
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

DialogRegion satisfies ComponentType<RegionProps>;
