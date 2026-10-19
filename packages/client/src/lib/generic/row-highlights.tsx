import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Platform, type PressableProps } from 'react-native';
import { ListContext } from './list-context';

/*
 * The List's pressed row on iOS. Its tint covers the separators either side of it, as a stock
 * iOS cell's does; the one above belongs to the row above. Android and web draw no separators.
 */
const PressedRow = createContext<number | undefined>(undefined);

// Apart from the row, so a row that only marks itself does not redraw on every press.
const SetPressedRow = createContext<
  Dispatch<SetStateAction<number | undefined>> | undefined
>(undefined);

export function PressedRowProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [pressed, setPressed] = useState<number>();

  return (
    <SetPressedRow value={setPressed}>
      <PressedRow value={pressed}>{children}</PressedRow>
    </SetPressedRow>
  );
}

// True when the separator under row `index` sits against the pressed row, above or below it.
export function useSeparatorCovered(index?: number): boolean {
  const pressed = useContext(PressedRow);

  return index !== undefined && (pressed === index || pressed === index + 1);
}

export function usePressedRowHandlers(): Pick<
  PressableProps,
  'onPressIn' | 'onPressOut'
> {
  const setPressed = useContext(SetPressedRow);
  const { index } = useContext(ListContext);

  if (Platform.OS !== 'ios' || !setPressed) return {};

  return {
    onPressIn: () => setPressed(index),
    onPressOut: () => setPressed(undefined),
  };
}
