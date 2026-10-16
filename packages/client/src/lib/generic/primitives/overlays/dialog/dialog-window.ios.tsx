import type { ReactElement } from 'react';
import { Modal } from 'react-native';
import { useDialogState } from './dialog-context';
import type { DialogWindowProps } from './dialog-props';

const orientations = [
  'portrait',
  'portrait-upside-down',
  'landscape-left',
  'landscape-right',
] as const;

// FullWindowOverlay left hosted SwiftUI controls unrendered; a native presentation keeps them in its view controller.
export function DialogWindow(props: DialogWindowProps): ReactElement {
  const onRequestClose = useRequestClose(props.dismissible);

  return (
    <Modal
      transparent
      visible
      presentationStyle="overFullScreen"
      supportedOrientations={[...orientations]}
      onRequestClose={onRequestClose}
    >
      {props.children}
    </Modal>
  );
}

function useRequestClose(dismissible: boolean | undefined): () => void {
  const { onOpenChange } = useDialogState();

  return () => {
    if (dismissible !== false) onOpenChange(false);
  };
}
