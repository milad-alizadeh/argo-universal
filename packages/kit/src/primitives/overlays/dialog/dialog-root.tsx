import type { ReactElement } from 'react';
import { View } from 'react-native';
import { CentredModalRoot } from '#primitives/overlays/centred-overlay';
import { useOpenState } from '#primitives/overlays/open-state';
import type { DialogRootProps } from './dialog-props';

// Every drawing and named region shares the dialog's controlled or local open state.
export function DialogRoot(props: DialogRootProps): ReactElement {
  const state = useOpenState(props);

  return (
    <CentredModalRoot {...state}>
      <View className={props.className} style={props.style}>
        {props.children}
      </View>
    </CentredModalRoot>
  );
}
