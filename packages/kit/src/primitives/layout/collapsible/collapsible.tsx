import {
  type ComponentProps,
  type ReactElement,
  useContext,
  useId,
} from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useOpenState } from '#primitives/overlays/open-state';
import { DrawnContent } from './collapsible-content';
import {
  CollapsibleContext,
  CollapsibleLayoutSyncContext,
} from './collapsible-context';
import { createCollapsibleHeader } from './collapsible-header';
import { LayoutSyncedContent } from './collapsible-layout-content';
import type {
  CollapsibleContentProps,
  CollapsibleProps,
} from './collapsible-props';

// One disclosure on every platform: a button that reports `expanded` and, on the web, names the region it controls.
function viewProps({
  open: _open,
  defaultOpen: _defaultOpen,
  onOpenChange: _onOpenChange,
  disabled: _disabled,
  ...view
}: CollapsibleProps): ComponentProps<typeof View> {
  return view;
}

function Collapsible(props: CollapsibleProps): ReactElement {
  const state = useOpenState(props);
  const contentId = useId();
  const disabled = Boolean(props.disabled);

  return (
    <CollapsibleContext value={{ ...state, disabled, contentId }}>
      <View {...viewProps(props)} />
    </CollapsibleContext>
  );
}

type TriggerProps = Omit<ComponentProps<typeof Pressable>, 'role'>;

// Only the web has `aria-controls`; a phone's reader moves into the content in order.
const controls = (contentId: string): { 'aria-controls'?: string } =>
  Platform.OS === 'web' ? { 'aria-controls': contentId } : {};

function useTriggerBehaviour(props: TriggerProps): TriggerProps {
  const toggle = useContext(CollapsibleContext);

  return {
    ...controls(toggle.contentId),
    'aria-expanded': toggle.open,
    disabled: toggle.disabled || Boolean(props.disabled),
    onPress: (event) => {
      props.onPress?.(event);
      toggle.onOpenChange(!toggle.open);
    },
  };
}

function CollapsibleTrigger(props: TriggerProps): ReactElement {
  return <Pressable role="button" {...props} {...useTriggerBehaviour(props)} />;
}

// Legend List places the Feed's rows itself and hears a resize late, so the Feed's content moves with its row instead.
function CollapsibleContent(
  props: CollapsibleContentProps,
): ReactElement | null {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);

  if (layoutSync)
    return <LayoutSyncedContent {...props} layoutSync={layoutSync} />;

  return <DrawnContent {...props} />;
}

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleLayoutSyncContext,
  CollapsibleTrigger,
};

export { useCollapsibleHovered } from './collapsible-header';

export const CollapsibleHeader = createCollapsibleHeader(CollapsibleTrigger);
