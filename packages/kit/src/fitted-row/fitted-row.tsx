import {
  isValidElement,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { flattenedChildren } from '#kit/flattened-children';
import { cn } from '#kit/utils';
import { Pill } from '#primitives/status/pill';
import { fitCount, naturalWidth } from './fitted-row-fit';
import {
  countKey,
  type Item,
  type Measure,
  Measurements,
  useWidths,
} from './fitted-row-measurements';
import { useOverflowWatch } from './overflow-watch';

interface FittedRowProps {
  children: ReactNode;
  // The space between items, in points.
  gap: number;
  className?: string;
  testID?: string;
}

const itemsOf = (children: ReactNode): Item[] =>
  flattenedChildren(children).map((node, index) => ({
    // Prefixed, so no item's key meets a count's.
    key: `item:${isValidElement(node) && node.key !== null ? node.key : index}`,
    node,
  }));

/*
 * One line of items, such as a row's label Pills, that never cuts one: as many as fit whole, then a "+N" Pill for the
 * rest. Its own width is the width of every item shown, which it gives up as the room around it narrows, so what it
 * shows never decides the room it has. One item is drawn as it is.
 *
 * Most lines fit whole, and a list draws one per row as it scrolls, so a line first draws its items once and measures
 * only its room and their width together. Only a line they overflow draws every item and every possible count
 * unseen, so it knows their widths, through font scaling and live updates, before it fits.
 */
export function FittedRow(props: FittedRowProps): ReactNode {
  const items = itemsOf(props.children);

  if (items.length < 2) return <Line {...props}>{props.children}</Line>;

  return <FittedItems {...props} items={items} />;
}

// Every item, once, until they overflow the line; from then on the line fits them.
function FittedItems(props: FittingProps): ReactElement {
  const { overflowed, onRoom, onItems } = useOverflowWatch();

  if (overflowed) return <FittingLine {...props} />;

  return (
    <Line {...props} onLayout={onRoom}>
      <View
        className="shrink-0 flex-row items-center"
        style={{ gap: props.gap }}
        onLayout={onItems}
      >
        <ShownItems items={props.items} />
      </View>
    </Line>
  );
}

type LineProps = Omit<FittedRowProps, 'children'> & {
  children: ReactNode;
  width?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/*
 * The line clips at its sides, but leaves room above and below, so a mark an item draws past its own top, such as a
 * running count's dot, shows whole without making the line taller.
 */
const bleed = '-my-1 py-1';

const lineClass = `min-w-0 shrink flex-row items-center overflow-hidden ${bleed}`;

const fittingClass = `max-w-full min-w-0 shrink flex-row overflow-hidden ${bleed}`;

function Line(props: LineProps): ReactElement {
  return (
    <View
      testID={props.testID}
      onLayout={props.onLayout}
      className={cn(lineClass, props.className)}
      style={{ gap: props.gap, width: props.width }}
    >
      {props.children}
    </View>
  );
}

type FittingProps = Omit<FittedRowProps, 'children'> & { items: Item[] };

interface Fit {
  shown: Item[];
  hidden: number;
  width: number | undefined;
  onLayout: (event: LayoutChangeEvent) => void;
  measure: Measure;
}

// What the line shows, from the widths its unseen copies measured and the room it has.
function useFit(props: FittingProps): Fit {
  const [available, setAvailable] = useState(0);
  const { widths, measure } = useWidths();
  const itemWidths = props.items.map((item) => widths[item.key]);
  const counts = props.items.map((_, index) => widths[countKey(index + 1)]);
  const { gap } = props;
  const shown = fitCount({ widths: itemWidths, counts, available, gap });

  return {
    shown: props.items.slice(0, shown),
    hidden: props.items.length - shown,
    width: naturalWidth(itemWidths, gap),
    onLayout: (event) => setAvailable(event.nativeEvent.layout.width),
    measure,
  };
}

// The unseen copies sit beside the line, not in it, so the line holds only what a reader sees.
function FittingLine(props: FittingProps): ReactElement {
  const fit = useFit(props);

  return (
    <View className={fittingClass}>
      <Line {...props} width={fit.width} onLayout={fit.onLayout}>
        <ShownItems items={fit.shown} />
        {fit.hidden > 0 ? <Pill text={countKey(fit.hidden)} /> : null}
      </Line>
      <Measurements items={props.items} measure={fit.measure} />
    </View>
  );
}

function ShownItems({ items }: { items: Item[] }): ReactNode {
  return items.map((item) => (
    <View key={item.key} className="shrink-0">
      {item.node}
    </View>
  ));
}
