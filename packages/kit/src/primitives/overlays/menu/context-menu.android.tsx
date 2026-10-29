import { Box, DropdownMenu } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';
import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import {
  type ComponentType,
  type ReactElement,
  use,
  useEffect,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  useLongPressGesture,
} from 'react-native-gesture-handler';
import { Host } from '#primitives/native/host';
import { contextMenuSections } from './context-menu-native-items';
import {
  ContextMenuPeerContext,
  type ContextMenuPeer,
} from './context-menu-peer';
import type { ContextMenuProps } from './context-menu-props';
import { MenuDropdownItems } from './menu-dropdown-items';
import { dividedItems } from './menu-native-items';

// The stock dropdown anchors behind the trigger; Gesture Handler observes long presses across any trigger subtree.
const anchorFrame = [fillMaxSize()];

/*
 * Material's dropdown, anchored at the element: Compose's DropdownMenu, controlled by `expanded` and
 * `onDismissRequest`, as the Menu draws it. It opens from an empty anchor behind the element, so the element's own
 * long press opens it, including layout and multi-node Plugin triggers;
 * `performAndroidHapticsAsync(LONG_PRESS)` is the system's long-press haptic.
 */
export function ContextMenu(props: ContextMenuProps): ReactElement {
  const menu = useOpenableMenu();
  const peer = use(ContextMenuPeerContext);

  // On a movable row the peer is its drag: the lift closes the menu, so a long press then a move drags as on iOS.
  useEffect(() => peer?.onTakeOver(menu.close), [peer, menu.close]);

  return (
    <View>
      <Host style={StyleSheet.absoluteFill}>
        <AnchoredDropdown {...props} menu={menu} />
      </Host>
      <LongPressTrigger onActivate={menu.open} simultaneousWith={peer?.gesture}>
        {props.children}
      </LongPressTrigger>
    </View>
  );
}

// Beside a peer gesture, the long press runs with it, so the peer keeps the touch once the menu opens.
interface TriggerProps {
  children: ReactElement;
  onActivate: () => void;
  simultaneousWith: ContextMenuPeer['gesture'] | undefined;
}

function LongPressTrigger(props: TriggerProps): ReactElement {
  // One object literal: the Worklets Babel plugin cannot read a spread config.
  const gesture = useLongPressGesture({
    runOnJS: true,
    onActivate: props.onActivate,
    simultaneousWith: props.simultaneousWith,
  });

  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>{props.children}</View>
    </GestureDetector>
  );
}

type AnchoredProps = ContextMenuProps & { menu: OpenableMenu };

function AnchoredDropdown(props: AnchoredProps): ReactElement {
  return (
    <DropdownMenu {...props.menu.state}>
      <DropdownMenu.Trigger>
        <Box modifiers={anchorFrame} />
      </DropdownMenu.Trigger>
      <MenuDropdownItems
        items={dividedItems(contextMenuSections(props))}
        onChosen={props.menu.state.onDismissRequest}
      />
    </DropdownMenu>
  );
}

interface OpenableMenu {
  state: { expanded: boolean; onDismissRequest: () => void };
  open: () => void;
  close: () => void;
}

// Opening plays the long-press haptic; `onDismissRequest` closes the menu on an outside tap, back, or a choice.
function useOpenableMenu(): OpenableMenu {
  const [expanded, setExpanded] = useState(false);
  const [close] = useState(() => (): void => setExpanded(false));

  return {
    state: { expanded, onDismissRequest: close },
    close,
    open: () => {
      void performAndroidHapticsAsync(AndroidHaptics.Long_Press);
      setExpanded(true);
    },
  };
}

ContextMenu satisfies ComponentType<ContextMenuProps>;
