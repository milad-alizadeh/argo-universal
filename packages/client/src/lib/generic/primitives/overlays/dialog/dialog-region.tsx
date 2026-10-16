import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { useId } from 'react';
import { Portal } from '#primitives/overlays/portal';
import {
  DialogDescriptionText,
  DialogFrame,
  DialogTitleText,
} from './dialog-parts';
import type { DialogRegionProps as RegionProps } from './dialog-props';
import { DialogRoot } from './dialog-root';

const regionInset = 24;

const regionClass =
  'absolute inset-6 z-50 [&>[role=dialog]]:flex [&>[role=dialog]]:flex-1 [&>[role=dialog]]:min-h-0 [&>[role=dialog]]:outline-none';

export function DialogRegion(props: RegionProps): ReactElement {
  return (
    <Portal hostName={props.hostName} name={useId()}>
      <DialogRoot {...regionRootProps(props)}>
        {regionContent(props)}
      </DialogRoot>
    </Portal>
  );
}

function regionContent(props: RegionProps): ReactElement {
  return (
    <DialogFrame {...regionContentProps}>
      <DialogTitleText className="sr-only">{props.label}</DialogTitleText>
      <DialogDescriptionText className="sr-only">
        {props.description}
      </DialogDescriptionText>
      {props.children}
    </DialogFrame>
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

const regionContentProps = {
  className: 'flex-1 min-h-0',
  onEscapeKeyDown: (event: { preventDefault: () => void }): void =>
    event.preventDefault(),
};

DialogRegion satisfies ComponentType<RegionProps>;
