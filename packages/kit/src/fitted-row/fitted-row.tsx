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

interface FittedRowProps {
  children: ReactNode;
  // The space between items, in points.
  gap: number;
  className?: string;
  testID?: string;
}

interface Item {
  key: string;
  node: ReactNode;
}

const itemsOf = (children: ReactNode): Item[] =>
  flattenedChildren(children).map((node, index) => ({
    // Prefixed, so no item's key meets a count's.
    key: `item:${isValidElement(node) && node.key !== null ? node.key : index}`,
    node,
  }));

/*
 * One line of items, such as a row's label Pills, that never cuts one: as many as fit whole, then a "+N" Pill for the
 * rest. Every item and every possible count is drawn unseen first, so the line knows their widths, through font
 * scaling and live updates, before it fits. Its own width is the width of every item shown, which it gives up as the
 * room around it narrows, so what it shows never decides the room it has. One item is drawn as it is.
 */
export function FittedRow(props: FittedRowProps): ReactNode {
  const items = itemsOf(props.children);

  if (items.length < 2) return <Line {...props}>{props.children}</Line>;

  return <FittingLine {...props} items={items} />;
}

type LineProps = Omit<FittedRowProps, 'children'> & {
  children: ReactNode;
  width?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
};

function Line(props: LineProps): ReactElement {
  return (
    <View
      testID={props.testID}
      onLayout={props.onLayout}
      className={cn(
        'min-w-0 shrink flex-row items-center overflow-hidden',
        props.className,
      )}
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
    <View className="max-w-full min-w-0 shrink flex-row overflow-hidden">
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

const countKey = (hidden: number): string => `+${hidden}`;

type Measure = (key: string, width: number) => void;

interface Widths {
  widths: Record<string, number>;
  measure: Measure;
}

function useWidths(): Widths {
  const [widths, setWidths] = useState<Record<string, number>>({});

  const measure: Measure = (key, width) => {
    setWidths((current) =>
      current[key] === width ? current : { ...current, [key]: width },
    );
  };

  return { widths, measure };
}

const hiddenProps = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  pointerEvents: 'none',
} as const;

const countItems = (items: Item[]): Item[] =>
  items.map((_, index) => {
    const key = countKey(index + 1);

    return { key, node: <Pill text={key} /> };
  });

// Every item and every possible "+N", drawn unseen at their own widths.
function Measurements(props: {
  items: Item[];
  measure: Measure;
}): ReactElement {
  return (
    <View {...hiddenProps} className="absolute top-0 left-0 flex-row opacity-0">
      {[...props.items, ...countItems(props.items)].map((item) => (
        <Measured key={item.key} item={item} measure={props.measure} />
      ))}
    </View>
  );
}

type MeasuredProps = { item: Item; measure: Measure };

function Measured({ item, measure }: MeasuredProps): ReactElement {
  return (
    <View
      className="shrink-0"
      onLayout={(event) => measure(item.key, event.nativeEvent.layout.width)}
    >
      {item.node}
    </View>
  );
}
