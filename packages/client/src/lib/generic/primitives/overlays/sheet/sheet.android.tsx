import {
  ModalBottomSheet,
  type ModalBottomSheetRef,
} from '@expo/ui/jetpack-compose';
import {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '#primitives/native/host';
import { usePrimitiveColor } from '#primitives/native/primitive-color';
import {
  SheetLink,
  SheetNavigationProvider,
  SheetPage,
  useSheetStack,
  type SheetStack,
} from './sheet-pages';
import type { SheetProps } from './sheet-props';
import { SheetPages } from './sheet-stack.android';
import { sheetDetents } from './sheet-state';

type SheetRef = RefObject<ModalBottomSheetRef | null>;

type PresentationProps = SheetProps & { stack: SheetStack; sheetRef: SheetRef };

// Material's modal bottom sheet; its pages slide across inside it.
function SheetRoot(props: SheetProps): ReactElement {
  const stack = useSheetStack(props);
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const mounted = useSheetPresence(props.open, sheetRef, stack.reports.closed);

  return (
    <SheetNavigationProvider value={stack.navigation}>
      <View style={props.style} className="min-w-0 shrink">
        <SheetTrigger {...props} />
        {mounted && (
          <SheetPresentation {...props} stack={stack} sheetRef={sheetRef} />
        )}
      </View>
    </SheetNavigationProvider>
  );
}

function SheetTrigger(props: SheetProps): ReactElement | null {
  if (!props.trigger) return null;

  return cloneElement(props.trigger, {
    onPress: () => props.onOpenChange(true),
  });
}

function SheetPresentation({
  sheetRef,
  ...props
}: PresentationProps): ReactElement {
  return (
    <Host style={{ position: 'absolute' }}>
      <ModalBottomSheet {...useModalProps(props)} ref={sheetRef}>
        <SheetPages {...props} />
      </ModalBottomSheet>
    </Host>
  );
}

type ModalProps = Omit<
  React.ComponentProps<typeof ModalBottomSheet>,
  'children' | 'ref'
>;

function useModalProps(props: Omit<PresentationProps, 'sheetRef'>): ModalProps {
  const colors = useNativeTheme().colors;

  return {
    containerColor: colors.content,
    contentColor: colors.foreground,
    scrimColor: usePrimitiveColor('text-foreground/32'),
    onDismissRequest: props.stack.reports.dismissed,
    skipPartiallyExpanded: !restsHalfOpen(props),
    ...dismissal(props.dismissible !== false),
  };
}

// Only a sheet that rests at the medium height stops half open on the way up.
function restsHalfOpen(
  props: Pick<PresentationProps, 'detents' | 'stack'>,
): boolean {
  const detents = sheetDetents({
    detents: props.detents,
    paged: props.stack.pages.length > 0,
  });

  return detents?.includes('medium') === true;
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
  Page: SheetPage,
  Link: SheetLink,
});
