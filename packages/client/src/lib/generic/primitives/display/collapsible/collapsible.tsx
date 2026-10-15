import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import { useState, type ReactElement } from 'react';
import { CollapsibleContent } from './collapsible-content';
import {
  CollapsibleLayoutSyncContext,
  OpenContext,
} from './collapsible-context';
import { Header } from './collapsible-header';
import type {
  CollapsibleHeaderProps,
  CollapsibleProps,
} from './collapsible-props';

interface OpenState {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useOpenState(props: CollapsibleProps): OpenState {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    props.defaultOpen ?? false,
  );

  return {
    open: props.open ?? uncontrolledOpen,
    onOpenChange: (nextOpen) => {
      if (props.open === undefined) setUncontrolledOpen(nextOpen);
      props.onOpenChange?.(nextOpen);
    },
  };
}

function rootProps({
  open: _open,
  defaultOpen: _defaultOpen,
  onOpenChange: _onOpenChange,
  ...props
}: CollapsibleProps): CollapsibleProps {
  return props;
}

function Collapsible(options: CollapsibleProps): ReactElement {
  const { children, ...props } = rootProps(options);
  const state = useOpenState(options);

  return (
    <OpenContext.Provider value={state.open}>
      <CollapsiblePrimitive.Root {...props} {...state}>
        {children}
      </CollapsiblePrimitive.Root>
    </OpenContext.Provider>
  );
}

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleLayoutSyncContext,
  CollapsibleTrigger,
};

export { useCollapsibleHovered } from './collapsible-header';

export function CollapsibleHeader(props: CollapsibleHeaderProps): ReactElement {
  return <Header {...props} trigger={CollapsibleTrigger} />;
}
