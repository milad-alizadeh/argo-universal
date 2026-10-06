import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useCallback } from 'react';
import { Modal, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolveClassNames } from 'uniwind';
import { Dialog, DialogTrigger } from '#primitives/dialog';
import type { ComposerSheetProps } from './ComposerSheet';

export function ComposerSheet({
  style,
  open,
  onOpenChange,
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
  return (
    <Dialog style={style} open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </DialogTrigger>
      {open && (
        <Modal
          transparent
          visible
          onRequestClose={() => onOpenChange(false)}
          statusBarTranslucent
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <BottomSheet
              index={0}
              enableDynamicSizing
              enablePanDownToClose
              maxDynamicContentSize={height * 0.85}
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
                  paddingBottom: Math.max(32, insets.bottom),
                }}
              >
                {children}
              </BottomSheetScrollView>
            </BottomSheet>
          </GestureHandlerRootView>
        </Modal>
      )}
    </Dialog>
  );
}
