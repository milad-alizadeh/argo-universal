import { RNHostView } from '@expo/ui';
import { DropdownMenu } from '@expo/ui/jetpack-compose';
import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import {
  type ComponentType,
  cloneElement,
  type ReactElement,
  useState,
} from 'react';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { contextMenuSections } from './context-menu-native-items';
import type { ContextMenuProps } from './context-menu-props';
import { MenuDropdownItems } from './menu-dropdown-items';
import { dividedItems } from './menu-native-items';

// The Host is as wide as its place in the page and as tall as the element, so a full-width row keeps its width.
const hostSize = { vertical: true } as const;

/*
 * Material's dropdown, anchored at the element: Compose's DropdownMenu, controlled by `expanded` and
 * `onDismissRequest`, as the Menu draws it. The element's own long press opens it, so its press keeps the pressed
 * tint while held; `performAndroidHapticsAsync(LONG_PRESS)` is the system's long-press haptic.
 */
export function ContextMenu(props: ContextMenuProps): ReactElement {
  const menu = useOpenableMenu();
  const color = useMaterialPalette().roles.surfaceContainer;

  return (
    <Host matchContents={hostSize}>
      <DropdownMenu {...menu.state} color={color}>
        <MenuAnchor onLongPress={menu.open}>{props.children}</MenuAnchor>
        <MenuDropdownItems
          items={dividedItems(contextMenuSections(props))}
          onChosen={menu.state.onDismissRequest}
        />
      </DropdownMenu>
    </Host>
  );
}

// The dropdown opens at the element, which takes its long press.
function MenuAnchor(props: {
  onLongPress: () => void;
  children: ContextMenuProps['children'];
}): ReactElement {
  return (
    <DropdownMenu.Trigger>
      <RNHostView matchContents>
        {cloneElement(props.children, { onLongPress: props.onLongPress })}
      </RNHostView>
    </DropdownMenu.Trigger>
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
