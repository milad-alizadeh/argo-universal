import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import {
  useContext,
  useState,
  type ReactElement,
  type ComponentProps,
} from 'react';
import { Platform } from 'react-native';
import { cn } from '#lib/utils';
import {
  CollapsibleLayoutSyncContext,
  OpenContext,
  type ContentProps,
} from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import { NativeContent } from './collapsible-native-content';

type CollapsibleProps = Omit<
  ComponentProps<typeof CollapsiblePrimitive.Root>,
  'asChild'
>;
function useOpenState(props: CollapsibleProps): {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} {
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
function WebContent({ className, ...props }: ContentProps): ReactElement {
  const classes = cn(
    'overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none',
    className,
  );
  return <CollapsiblePrimitive.Content {...props} className={classes} />;
}
function CollapsibleContent(props: ContentProps): ReactElement {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);
  if (layoutSync)
    return <LayoutSyncedContent {...props} layoutSync={layoutSync} />;
  if (Platform.OS === 'web') return <WebContent {...props} />;
  return <NativeContent {...props} />;
}
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleLayoutSyncContext,
  CollapsibleTrigger,
};
