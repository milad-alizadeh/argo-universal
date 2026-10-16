import * as RadixCollapsible from '@radix-ui/react-collapsible';
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  useContext,
} from 'react';
import { Pressable, View } from 'react-native';
import { type OpenState, useOpenState } from '#primitives/overlays/open-state';
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

/*
 * The web's collapsible, on Radix Collapsible (`@radix-ui/react-collapsible`): Root `open`/`onOpenChange`/
 * `disabled` wires the trigger's `aria-expanded` and `aria-controls` to the content's region.
 */
const ToggleContext = createContext<OpenState & { disabled: boolean }>({
  open: false,
  disabled: false,
  onOpenChange: () => {},
});

function viewOf({
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
  const disabled = Boolean(props.disabled);

  return (
    <OpenContext.Provider value={state.open}>
      <ToggleContext value={{ ...state, disabled }}>
        <RadixCollapsible.Root {...state} disabled={disabled}>
          <View {...viewOf(props)} />
        </RadixCollapsible.Root>
      </ToggleContext>
    </OpenContext.Provider>
  );
}

type TriggerProps = Omit<ComponentProps<typeof Pressable>, 'role'>;

// React Native Web's Pressable keeps Radix's click from reaching the root, so the press toggles it.
function CollapsibleTrigger(props: TriggerProps): ReactElement {
  const behaviour = useTriggerBehaviour(props);

  return (
    <RadixCollapsible.Trigger disabled={!!behaviour.disabled} asChild>
      <Pressable role="button" {...props} {...behaviour} />
    </RadixCollapsible.Trigger>
  );
}

function useTriggerBehaviour(
  props: TriggerProps,
): Pick<TriggerProps, 'disabled' | 'onPress'> {
  const toggle = useContext(ToggleContext);

  return {
    disabled: toggle.disabled || Boolean(props.disabled),
    onPress: (event) => {
      props.onPress?.(event);
      toggle.onOpenChange(!toggle.open);
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
