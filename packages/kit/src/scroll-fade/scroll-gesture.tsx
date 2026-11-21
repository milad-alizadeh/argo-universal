import { createContext, type ReactElement } from 'react';
import {
  GestureDetector,
  useNativeGesture,
  type NativeGesture,
} from 'react-native-gesture-handler';

export const ScrollGestureContext = createContext<NativeGesture | undefined>(
  undefined,
);

export function ScrollGesture({
  children,
}: {
  children: ReactElement;
}): ReactElement {
  const gesture = useNativeGesture({});

  return (
    <ScrollGestureContext value={gesture}>
      <GestureDetector gesture={gesture}>{children}</GestureDetector>
    </ScrollGestureContext>
  );
}
