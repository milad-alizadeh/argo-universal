import { useWindowDimensions } from 'react-native';
import type { ListLook } from '../../../list-look';
import { useListLook } from '../../../list-look-context';
import type { ListProps } from './list-props';

// The smallest a row draws: a one-line compact or menu row, and a regular row. Under, never over, so Legend List mounts enough rows and not too few.
const rowEstimates = { oneLine: 36, regular: 56 } as const;

// How far ahead of the window a List of more than a window of rows draws, as the Feed does, so a fling does not outrun its rows.
const longListDrawDistance = 800;

type Measures = Required<Pick<ListProps<never>, 'estimatedItemSize'>> &
  Pick<ListProps<never>, 'drawDistance'>;

type Asked = Pick<ListProps<never>, 'estimatedItemSize' | 'drawDistance'>;

const lookEstimate = ({ compact, menu }: ListLook): number =>
  compact || menu ? rowEstimates.oneLine : rowEstimates.regular;

function useRowEstimate(asked: Asked): number {
  const look = useListLook();

  return asked.estimatedItemSize ?? lookEstimate(look);
}

const drawnAhead = (asked: Asked, outruns: boolean): number | undefined =>
  asked.drawDistance ?? (outruns ? longListDrawDistance : undefined);

/*
 * What a List of children tells Legend List about its rows, which it cannot measure before it draws them: a row size
 * from the List look (Legend List swaps in the average of the rows it has measured, per item type, once it has some),
 * and a longer draw distance when the rows outrun the window. A caller's own always wins. Returns the window's height
 * it read, for the List's own cap.
 */
export function useChildSizing(
  asked: Asked,
  rows: number,
): Measures & { height: number } {
  const { height } = useWindowDimensions();
  const estimate = useRowEstimate(asked);

  return {
    height,
    estimatedItemSize: estimate,
    drawDistance: drawnAhead(asked, rows * estimate > height),
  };
}
