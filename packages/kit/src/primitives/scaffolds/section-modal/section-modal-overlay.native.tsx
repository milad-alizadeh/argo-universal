import type { ComponentProps, ReactElement } from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  CentredModalFrame,
  CentredOverlayScope,
  useCentredModalState,
} from '#primitives/overlays/centred-overlay';

type OverlayProps = ComponentProps<typeof CentredModalFrame>;

// A native Modal gives the card the whole window and keeps the stack's Navigation context.
export function SectionModalOverlay(props: OverlayProps): ReactElement {
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
      <View className="flex-1 items-center justify-center">
        <Pressable
          accessible={false}
          className="absolute inset-0 bg-scrim/50"
          onPress={dismiss}
        />
        <CentredOverlayScope>
          <CentredModalFrame {...props} />
        </CentredOverlayScope>
      </View>
    </Modal>
  );
}
