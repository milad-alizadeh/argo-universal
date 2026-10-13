import type * as React from 'react';
import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { DrawerProgressContext } from 'react-native-drawer-layout';
import ReanimatedDrawerLayout, {
  type DrawerLayoutMethods,
  type DrawerLayoutProps,
  DrawerLockMode,
  DrawerType,
} from 'react-native-gesture-handler/ReanimatedDrawerLayout';
import type { SharedValue } from 'react-native-reanimated';
import { swipeOpens } from './drawer-swipe';
import type { PhoneDrawerProps } from './phone-drawer';

type DrawerToggle = Pick<PhoneDrawerProps, 'open' | 'onOpen' | 'onClose'>;

type DrawerRef = RefObject<DrawerLayoutMethods | null>;

type DrawerLook = Pick<
  DrawerLayoutProps,
  | 'drawerType'
  | 'drawerLockMode'
  | 'drawerWidth'
  | 'drawerBackgroundColor'
  | 'overlayColor'
  | 'renderNavigationView'
>;

function moveDrawer(drawer: DrawerLayoutMethods | null, open: boolean): void {
  if (!drawer) return;

  if (open) drawer.openDrawer();
  else drawer.closeDrawer();
}

function reportSettle(toggle: DrawerToggle, settledOpen: boolean): void {
  if (settledOpen === toggle.open) return;

  if (settledOpen) toggle.onOpen();
  else toggle.onClose();
}

interface DrawerTarget {
  drawerRef: DrawerRef;
  targetOpenRef: RefObject<boolean>;
}

function useDrawerTarget(open: boolean): DrawerTarget {
  const drawerRef = useRef<DrawerLayoutMethods>(null);
  const targetOpenRef = useRef(false);
  useEffect(() => {
    if (targetOpenRef.current === open) return;
    targetOpenRef.current = open;
    moveDrawer(drawerRef.current, open);
  }, [open]);

  return { drawerRef, targetOpenRef };
}

interface DrawerSync {
  drawerRef: DrawerRef;
  onDrawerSettle: (settledOpen: boolean) => void;
}

function useDrawerSync(toggle: DrawerToggle): DrawerSync {
  const { drawerRef, targetOpenRef } = useDrawerTarget(toggle.open);

  const onDrawerSettle = (settledOpen: boolean): void => {
    targetOpenRef.current = settledOpen;
    reportSettle(toggle, settledOpen);
  };

  return { drawerRef, onDrawerSettle };
}

function lockMode(swipeEnabled: boolean): DrawerLockMode {
  return swipeEnabled && swipeOpens
    ? DrawerLockMode.UNLOCKED
    : DrawerLockMode.LOCKED_CLOSED;
}

function drawerLook({
  swipeEnabled = true,
  width,
  surfaceStyle,
  renderDrawerContent,
}: PhoneDrawerProps): DrawerLook {
  return {
    drawerType: DrawerType.BACK,
    drawerLockMode: lockMode(swipeEnabled),
    drawerWidth: width,
    drawerBackgroundColor: String(surfaceStyle.backgroundColor),
    overlayColor: 'transparent',
    renderNavigationView: renderDrawerContent,
  };
}

function provideProgress(
  children: ReactNode,
): (progress?: SharedValue<number>) => ReactNode {
  return (progress) =>
    progress && (
      <DrawerProgressContext.Provider value={progress}>
        {children}
      </DrawerProgressContext.Provider>
    );
}

function SyncedDrawerLayout(props: PhoneDrawerProps): React.JSX.Element {
  const { drawerRef, onDrawerSettle } = useDrawerSync(props);

  return (
    <ReanimatedDrawerLayout
      ref={drawerRef}
      {...drawerLook(props)}
      onDrawerOpen={() => onDrawerSettle(true)}
      onDrawerClose={() => onDrawerSettle(false)}
    >
      {provideProgress(props.children)}
    </ReanimatedDrawerLayout>
  );
}

export function PhoneDrawer(props: PhoneDrawerProps): React.JSX.Element {
  return (
    <View
      className="flex-1"
      style={props.surfaceStyle}
      onAccessibilityEscape={props.onClose}
    >
      <SyncedDrawerLayout {...props} />
    </View>
  );
}
