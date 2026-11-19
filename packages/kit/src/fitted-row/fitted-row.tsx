import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { flattenedChildren } from '#kit/flattened-children';
import { cn } from '#kit/utils';
import {
  type DrawMore,
  drawPill,
  type Item,
  Measurements,
} from './fitted-row-measurements';
import { type Fit, useFit } from './fitted-row-use-fit';
import { useOverflowWatch } from './overflow-watch';

export type { DrawMore, Overflow } from './fitted-row-measurements';

export interface FittedRowProps {
  children: ReactNode;
  // The space between items, in points.
  gap: number;
  className?: string;
  testID?: string;
  // Items held back before they reached the line, such as a Slot's overflow: "+N" counts them and always shows.
  hiddenElsewhere?: number;
  // Draws "+N", such as a trigger listing what it holds; a Pill by default.
  more?: DrawMore;
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
  const hiddenElsewhere = props.hiddenElsewhere ?? 0;

  if (items.length + hiddenElsewhere < 2)
    return <Line {...props}>{props.children}</Line>;

  return (
    <FittedItems {...props} items={items} hiddenElsewhere={hiddenElsewhere} />
  );
}

// Every item, once, until they overflow the line; from then on the line fits them.
function FittedItems(props: FittingProps): ReactElement {
  const { overflowed, onRoom, onItems } = useOverflowWatch();

  if (overflowed) return <FittingLine {...props} />;

  return (
    <Line {...props} onLayout={onRoom}>
      <EveryItem {...props} onLayout={onItems} />
    </Line>
  );
}

// Every item, then "+N" for the items held back before the line, while they all fit; measured together.
function EveryItem(
  props: FittingProps & { onLayout: (event: LayoutChangeEvent) => void },
): ReactElement {
  return (
    <View
      pointerEvents="box-none"
      className="shrink-0 flex-row items-center"
      style={{ gap: props.gap }}
      onLayout={props.onLayout}
    >
      <ShownItems items={props.items} />
      <HeldBack {...props} />
    </View>
  );
}

// "+N" for the items held back before the line.
function HeldBack(props: FittingProps): ReactNode {
  if (props.hiddenElsewhere === 0) return null;

  const more = props.more ?? drawPill;
  const firstHidden = props.items.length;

  return (
    <View pointerEvents="box-none" className="shrink-0">
      {more({ count: props.hiddenElsewhere, firstHidden })}
    </View>
  );
}

type LineProps = Omit<FittedRowProps, 'children'> & {
  children: ReactNode;
  width?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/*
 * Every View the line draws only lays out its items, so a press between or on them reaches what is under the line,
 * such as a row's own press, unless an item takes it.
 *
 * The line clips at its sides, but leaves room above and below, so a mark an item draws past its own top, such as a
 * running count's dot, shows whole without making the line taller.
 */
const bleed = '-my-1 py-1';

const lineClass = `min-w-0 shrink flex-row items-center overflow-hidden ${bleed}`;

const fittingClass = `max-w-full min-w-0 shrink flex-row overflow-hidden ${bleed}`;

function Line(props: LineProps): ReactElement {
  return (
    <View
      pointerEvents="box-none"
      testID={props.testID}
      onLayout={props.onLayout}
      className={cn(lineClass, props.className)}
      style={{ gap: props.gap, width: props.width }}
    >
      {props.children}
    </View>
  );
}

export type FittingProps = Omit<FittedRowProps, 'children'> & {
  items: Item[];
  hiddenElsewhere: number;
};

// The unseen copies sit beside the line, not in it, so the line holds only what a reader sees.
function FittingLine(props: FittingProps): ReactElement {
  const fit = useFit(props);
  const more = props.more ?? drawPill;

  return (
    <View pointerEvents="box-none" className={fittingClass}>
      <Line {...props} width={fit.width} onLayout={fit.onLayout}>
        <ShownItems items={fit.shown} />
        <ShownCount fit={fit} more={more} />
      </Line>
      <Measurements {...props} more={more} measure={fit.measure} />
    </View>
  );
}

// "+N" last on the line, while it holds anything.
function ShownCount({ fit, more }: { fit: Fit; more: DrawMore }): ReactNode {
  if (fit.count === 0) return null;

  return (
    <View pointerEvents="box-none" className="shrink-0">
      {more({ count: fit.count, firstHidden: fit.shown.length })}
    </View>
  );
}

function ShownItems({ items }: { items: Item[] }): ReactNode {
  return items.map((item) => (
    <View key={item.key} pointerEvents="box-none" className="shrink-0">
      {item.node}
    </View>
  ));
}
