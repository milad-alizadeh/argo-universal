import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
  useSyncLayout,
} from '@legendapp/list/react-native';
import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type RenderItem<T> = LegendListProps<T>['renderItem'];

// Popovers, menus and dialogs zoom in; other animations, such as a Feed group opening, keep their own scroll anchoring.
const overlay = '[role="dialog"], [role="menu"]';

function listNode(list: LegendListRef | null): Node | null {
  const node: unknown = list?.getScrollableNode();

  return node instanceof Node ? node : null;
}

function animatedOverlay(event: AnimationEvent): Element | undefined {
  const { target } = event;

  return target instanceof Element && target.matches(overlay)
    ? target
    : undefined;
}

// An overlay around the list finished an animation; one of the list's own rows does not count.
function overlayAround(event: AnimationEvent, node: Node | null): boolean {
  return animatedOverlay(event)?.contains(node) === true;
}

// Counts the entrances of overlays around the list.
function useOverlayEntrances(list: RefObject<LegendListRef | null>): number {
  const [entrances, setEntrances] = useState(0);

  useEffect(() => {
    const count = (event: AnimationEvent): void => {
      if (overlayAround(event, listNode(list.current)))
        setEntrances((value) => value + 1);
    };

    document.addEventListener('animationend', count, true);

    return (): void =>
      document.removeEventListener('animationend', count, true);
  }, [list]);

  return entrances;
}

const OverlayEntrances = createContext(0);

// Measures its row again after each entrance, in place: the row keeps its elements and focus.
function RemeasuredRow({ children }: { children: ReactNode }): ReactNode {
  const entrances = use(OverlayEntrances);
  const syncLayout = useSyncLayout();

  useEffect(() => {
    if (entrances > 0) syncLayout();
  }, [entrances, syncLayout]);

  return children;
}

type ListProps<T> = LegendListProps<T> & {
  ref: (instance: LegendListRef | null) => void;
};

function useRemeasuredRenderItem<T>(renderItem: RenderItem<T>): RenderItem<T> {
  const wrapped = useCallback<NonNullable<RenderItem<T>>>(
    (info) => <RemeasuredRow>{renderItem?.(info)}</RemeasuredRow>,
    [renderItem],
  );

  return renderItem ? wrapped : undefined;
}

// The list, kept here and handed to the caller's ref.
type ListRefs = readonly [
  RefObject<LegendListRef | null>,
  ListProps<never>['ref'],
];

function useListRef(ref: ListProps<never>['ref']): ListRefs {
  const list = useRef<LegendListRef>(null);

  const bothRefs = useCallback(
    (instance: LegendListRef | null) => {
      list.current = instance;
      ref(instance);
    },
    [ref],
  );

  return [list, bothRefs] as const;
}

/*
 * Legend List's web build measures rows with getBoundingClientRect, which includes an ancestor's transform. A
 * popover, menu or dialog opens with a zoom-in from 95%, so rows measured mid-animation keep 95% of their height,
 * and a short list that fits clips its last row and scrolls. Once an overlay around the list has finished
 * animating, each row measures itself again, in place.
 */
export function MeasuredLegendList<T>({
  ref,
  ...props
}: ListProps<T>): ReactNode {
  const [list, bothRefs] = useListRef(ref);
  const renderItem = useRemeasuredRenderItem(props.renderItem);

  return (
    <OverlayEntrances value={useOverlayEntrances(list)}>
      <LegendList {...props} renderItem={renderItem} ref={bothRefs} />
    </OverlayEntrances>
  );
}
