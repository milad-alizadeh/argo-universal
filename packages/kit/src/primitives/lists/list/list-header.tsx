import { createContext, use, type ReactElement } from 'react';
import { View } from 'react-native';
import { useRowGutter } from './list-data';
import type { ListProps } from './list-props';

const RowGutterContext = createContext(0);

// The side space the List's rows hold, for a header that bleeds to the List's edges and pads its own scrolling content.
export const useListGutter = (): number => use(RowGutterContext);

// A header lines up with the rows; one that scrolls sideways runs to the edges and takes the gutter as its content's padding.
export function ListHeader<Item>({
  list,
}: {
  list: ListProps<Item>;
}): ReactElement {
  const gutter = useRowGutter(list);

  if (list.headerBleeds)
    return <RowGutterContext value={gutter}>{list.header}</RowGutterContext>;

  return <View style={{ paddingHorizontal: gutter }}>{list.header}</View>;
}
