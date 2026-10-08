import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect } from 'react';
import { Modal, Platform, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolveClassNames } from 'uniwind';
import { Dialog, DialogTrigger } from '#primitives/dialog';
import type { ComposerSheetProps } from './composer-sheet';

const maximumHeightFraction = 0.85;
const minimumBottomPadding = 32;

export function ComposerSheet({
  style,
  open,
  onOpenChange,
  onClosed,
  trigger,
  label,
  children,
}: ComposerSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const background = useResolveClassNames('bg-popover rounded-t-xl');
  const handle = useResolveClassNames(
    'bg-muted-foreground/40 w-9 h-1.25 rounded-full',
  );
  const backdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.2}
      />
    ),
    [],
  );
  // iOS presents a picker on the top view controller, so wait until the Modal's has gone.
  const dismissReported = Platform.OS === 'ios';
  useEffect(() => {
    if (!open && !dismissReported) onClosed();
  }, [open, dismissReported, onClosed]);
  return (
    <Dialog style={style} open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </DialogTrigger>
      <Modal
        transparent
        visible={open}
        onRequestClose={() => onOpenChange(false)}
        onDismiss={onClosed}
        statusBarTranslucent
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheet
            index={0}
            enableDynamicSizing
            enablePanDownToClose
            maxDynamicContentSize={height * maximumHeightFraction}
            onClose={() => onOpenChange(false)}
            backdropComponent={backdrop}
            backgroundStyle={background}
            handleStyle={{ paddingTop: 6, paddingBottom: 8 }}
            handleIndicatorStyle={handle}
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              role="dialog"
              accessibilityLabel={label}
              accessibilityViewIsModal
              onAccessibilityEscape={() => onOpenChange(false)}
              contentContainerStyle={{
                paddingBottom: Math.max(minimumBottomPadding, insets.bottom),
              }}
            >
              {children}
            </BottomSheetScrollView>
          </BottomSheet>
        </GestureHandlerRootView>
      </Modal>
    </Dialog>
  );
}
