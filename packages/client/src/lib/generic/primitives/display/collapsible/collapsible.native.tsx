import {
  type ComponentProps,
  createContext,
  type ReactElement,
  useContext,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';
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

// Argo-drawn on phones (ADR-0020): Feed rows animate with LegendList, which a native Host per item would break.

interface Toggle {
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
}

const ToggleContext = createContext<Toggle>({
  disabled: false,
  onOpenChange: () => {},
});

function useToggle(props: CollapsibleProps): Toggle & { open: boolean } {
  const [ownOpen, setOwnOpen] = useState(Boolean(props.defaultOpen));

  return {
    open: props.open ?? ownOpen,
    disabled: Boolean(props.disabled),
    onOpenChange: (next) => {
      if (props.open === undefined) setOwnOpen(next);
      props.onOpenChange?.(next);
    },
  };
}

function viewOf({
  open: _open,
  defaultOpen: _defaultOpen,
  onOpenChange: _onOpenChange,
  disabled: _disabled,
  ...view
}: CollapsibleProps): CollapsibleProps {
  return view;
}

function Collapsible(props: CollapsibleProps): ReactElement {
  const { open, ...toggle } = useToggle(props);

  return (
    <OpenContext.Provider value={open}>
      <ToggleContext value={toggle}>
        <View {...viewOf(props)} />
      </ToggleContext>
    </OpenContext.Provider>
  );
}

type TriggerProps = Omit<ComponentProps<typeof Pressable>, 'role'>;

type TriggerBehaviour = Pick<
  TriggerProps,
  'accessibilityRole' | 'accessibilityState' | 'disabled' | 'onPress'
>;

function CollapsibleTrigger(props: TriggerProps): ReactElement {
  return <Pressable {...props} {...useTriggerBehaviour(props)} />;
}

function useTriggerBehaviour(props: TriggerProps): TriggerBehaviour {
  const open = useContext(OpenContext);
  const toggle = useContext(ToggleContext);
  const disabled = toggle.disabled || Boolean(props.disabled);

  return {
    accessibilityRole: 'button',
    accessibilityState: { expanded: open, disabled },
    disabled,
    onPress: (event) => {
      toggle.onOpenChange(!open);
      props.onPress?.(event);
    },
  };
}

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
