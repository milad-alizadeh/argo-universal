import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { DrawerProgressContext } from 'react-native-drawer-layout';
import ReanimatedDrawerLayout, {
  type DrawerLayoutMethods,
  DrawerLockMode,
  DrawerType,
} from 'react-native-gesture-handler/ReanimatedDrawerLayout';
import type { PhoneDrawerProps } from './phone-drawer';

export function PhoneDrawer({
  open,
  onOpen,
  onClose,
  onClosed,
  width,
  surfaceStyle,
  swipeEnabled = true,
  renderDrawerContent,
  children,
}: PhoneDrawerProps): React.JSX.Element {
  const drawer = useRef<DrawerLayoutMethods>(null);
  const targetOpen = useRef(false);
  useEffect(() => {
    if (targetOpen.current === open) return;
    targetOpen.current = open;
    if (open) drawer.current?.openDrawer();
    else drawer.current?.closeDrawer();
  }, [open]);

  return (
    <View
      className="flex-1"
      style={surfaceStyle}
      onAccessibilityEscape={onClose}
    >
      <ReanimatedDrawerLayout
        ref={drawer}
        drawerType={DrawerType.BACK}
        drawerLockMode={
          swipeEnabled ? DrawerLockMode.UNLOCKED : DrawerLockMode.LOCKED_CLOSED
        }
        drawerWidth={width}
        drawerBackgroundColor={String(surfaceStyle.backgroundColor)}
        overlayColor="transparent"
        renderNavigationView={renderDrawerContent}
        onDrawerOpen={() => {
          targetOpen.current = true;
          if (!open) onOpen();
        }}
        onDrawerClose={() => {
          targetOpen.current = false;
          if (open) onClose();
          onClosed?.();
        }}
      >
        {(progress) =>
          progress && (
            <DrawerProgressContext.Provider value={progress}>
              {children}
            </DrawerProgressContext.Provider>
          )
        }
      </ReanimatedDrawerLayout>
    </View>
  );
}
