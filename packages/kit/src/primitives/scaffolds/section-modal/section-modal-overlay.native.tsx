import type { ComponentProps, ReactElement } from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  CentredModalFrame,
  CentredOverlayScope,
  useCentredModalState,
} from '#primitives/overlays/centred-overlay';

type OverlayProps = ComponentProps<typeof CentredModalFrame>;

// A native Modal gives the card the whole window and keeps the stack's Navigation context.
export function SectionModalOverlay({
  scrimDismissLabel,
  className,
  children,
  ...props
}: OverlayProps): ReactElement {
  const { open, onOpenChange } = useCentredModalState();
  const dismiss = (): void => onOpenChange(false);

  return (
    <Modal
      transparent
      visible={open}
      onRequestClose={dismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <CentredOverlayScope>
        <CentredModalFrame
          {...props}
          className="flex-1 items-center justify-center"
        >
          <Pressable
            accessibilityLabel={scrimDismissLabel}
            accessibilityRole="button"
            className="absolute inset-0 bg-scrim/50"
            onAccessibilityTap={dismiss}
            onPress={dismiss}
          />
          <View className={className}>{children}</View>
        </CentredModalFrame>
      </CentredOverlayScope>
    </Modal>
  );
}
