import { Box, DropdownMenu } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';
import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import {
  type ComponentType,
  cloneElement,
  type ReactElement,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { contextMenuSections } from './context-menu-native-items';
import type { ContextMenuProps } from './context-menu-props';
import { MenuDropdownItems } from './menu-dropdown-items';
import { dividedItems } from './menu-native-items';

// The anchor fills the element's frame, behind it: the element stays a React Native view laid out by its own page, and takes every touch.
const anchorFrame = [fillMaxSize()];

/*
 * Material's dropdown, anchored at the element: Compose's DropdownMenu, controlled by `expanded` and
 * `onDismissRequest`, as the Menu draws it. It opens from an empty anchor behind the element, so the element's own
 * long press opens it and its press keeps the pressed tint while held;
 * `performAndroidHapticsAsync(LONG_PRESS)` is the system's long-press haptic.
 */
export function ContextMenu(props: ContextMenuProps): ReactElement {
  const menu = useOpenableMenu();

  return (
    <View>
      <Host style={StyleSheet.absoluteFill}>
        <AnchoredDropdown {...props} menu={menu} />
      </Host>
      {cloneElement(props.children, { onLongPress: menu.open })}
    </View>
  );
}

type AnchoredProps = ContextMenuProps & { menu: OpenableMenu };

function AnchoredDropdown(props: AnchoredProps): ReactElement {
  const { roles } = useMaterialPalette();

  return (
    <DropdownMenu {...props.menu.state} color={roles.surfaceContainer}>
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
}

// Opening plays the long-press haptic; `onDismissRequest` closes the menu on an outside tap, back, or a choice.
function useOpenableMenu(): OpenableMenu {
  const [expanded, setExpanded] = useState(false);

  return {
    state: { expanded, onDismissRequest: () => setExpanded(false) },
    open: () => {
      void performAndroidHapticsAsync(AndroidHaptics.Long_Press);
      setExpanded(true);
    },
  };
}

ContextMenu satisfies ComponentType<ContextMenuProps>;
