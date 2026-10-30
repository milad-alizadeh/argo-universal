import {
  ModalBottomSheet,
  type ModalBottomSheetRef,
} from '@expo/ui/jetpack-compose';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { View } from 'react-native';
import { Host, InsideHostContext } from '#primitives/native/host';
import { isDismissible } from './sheet-dismissible';
import type { SheetProps } from './sheet-props';
import {
  SheetLink,
  SheetNavigationProvider,
  SheetScreen,
  useSheetStack,
  type SheetStack,
} from './sheet-screens';
import { SheetScreens } from './sheet-stack.android';
import { SheetTrigger } from './sheet-trigger';

type SheetRef = RefObject<ModalBottomSheetRef | null>;

type PresentationProps = SheetProps & { stack: SheetStack; sheetRef: SheetRef };

// Material's modal bottom sheet; its pages slide across inside it.
function SheetRoot(props: SheetProps): ReactElement {
  const stack = useSheetStack(props);

  return (
    <SheetNavigationProvider value={stack.navigation}>
      {useContext(InsideHostContext) ? (
        <SheetPresence {...props} stack={stack} />
      ) : (
        <View style={props.style} className="min-w-0 shrink">
          <SheetTrigger {...props} />
          <SheetPresence {...props} stack={stack} />
        </View>
      )}
    </SheetNavigationProvider>
  );
}

function SheetPresence(
  props: SheetProps & { stack: SheetStack },
): ReactElement | null {
  const sheetRef = useRef<ModalBottomSheetRef>(null);

  const mounted = useSheetPresence(
    props.open,
    sheetRef,
    props.stack.reports.closed,
  );

  if (!mounted) return null;

  return <SheetPresentation {...props} sheetRef={sheetRef} />;
}

// A pushed page keeps the height the sheet is already at; only a drag takes it taller (owner, 2026-10-20).
function SheetPresentation({
  sheetRef,
  ...props
}: PresentationProps): ReactElement {
  return (
    <Host style={{ position: 'absolute' }}>
      <ModalBottomSheet {...useModalProps(props)} ref={sheetRef}>
        <SheetScreens {...props} />
      </ModalBottomSheet>
    </Host>
  );
}

type ModalProps = Omit<
  React.ComponentProps<typeof ModalBottomSheet>,
  'children' | 'ref'
>;

function useModalProps(props: Omit<PresentationProps, 'sheetRef'>): ModalProps {
  // Material's sheet colours: the Host binds surfaceContainerLow to Argo's content surface and the scrim to 32% foreground.
  return {
    onDismissRequest: props.stack.reports.dismissed,
    skipPartiallyExpanded: !restsHalfOpen(props),
    // ModalBottomSheet/index.d.ts: ignored when skipPartiallyExpanded, so only a half-open sheet opens full.
    initialFullyExpanded: props.initialDetent === 'large',
    ...dismissal(isDismissible(props.dismissible)),
  };
}

/*
 * Only a sheet that rests at the medium height stops half open on the way up. A sheet with pages takes a
 * height of its own and opens straight at it, so there is no half stop for it to pass through and nothing
 * for a drag to find above it (owner, 2026-10-21).
 */
function restsHalfOpen(
  props: Pick<PresentationProps, 'detents' | 'stack'>,
): boolean {
  if (props.stack.pages.length > 0) return false;

  return props.detents?.includes('medium') === true;
}

function dismissal(
  dismissible: boolean,
): Pick<ModalProps, 'sheetGesturesEnabled' | 'properties'> {
  return {
    sheetGesturesEnabled: dismissible,
    properties: {
      shouldDismissOnBackPress: dismissible,
      shouldDismissOnClickOutside: dismissible,
    },
  };
}

/*
 * The sheet stays composed until hide() has slid it away, as the ref's promise resolves after the
 * dismiss animation; only then does it leave the tree and report its close.
 */
function useSheetPresence(
  open: boolean,
  sheetRef: SheetRef,
  onClosed: () => void,
): boolean {
  const [mounted, setMounted] = useState(open);

  if (open && !mounted) setMounted(true);

  const unmount = useCallback(() => {
    setMounted(false);
    onClosed();
  }, [onClosed]);

  useUnmountAfterHide({ open, mounted, sheetRef }, unmount);

  return mounted;
}

interface Presence {
  open: boolean;
  mounted: boolean;
  sheetRef: SheetRef;
}

function useUnmountAfterHide(
  { open, mounted, sheetRef }: Presence,
  unmount: () => void,
): void {
  useEffect(() => {
    if (open || !mounted) return;

    return afterHide(sheetRef.current, unmount);
  }, [open, mounted, sheetRef, unmount]);
}

function afterHide(
  sheet: ModalBottomSheetRef | null,
  then: () => void,
): () => void {
  let live = true;

  void (sheet?.hide() ?? Promise.resolve()).then(() => {
    if (live) then();
  });

  return (): void => {
    live = false;
  };
}

export const Sheet = Object.assign(SheetRoot, {
  Screen: SheetScreen,
  Link: SheetLink,
});
