import type { GestureResponderEvent, ViewProps } from 'react-native';

export type PickPoint = (x: number, y: number) => void;

export function useWheelInput(disabled: boolean, pick: PickPoint): ViewProps {
  const at = ({ nativeEvent }: GestureResponderEvent): void => {
    if (!disabled) pick(nativeEvent.locationX, nativeEvent.locationY);
  };

  return {
    onStartShouldSetResponder: () => !disabled,
    onResponderGrant: at,
    onResponderMove: at,
  };
}
