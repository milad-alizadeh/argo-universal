import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type RefCallback,
  type SetStateAction,
  type TransitionEvent,
} from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';

interface Visibility {
  open: boolean;
  forceMount?: true;
}

type Region = RefObject<HTMLDivElement | null>;

type SetMounted = Dispatch<SetStateAction<boolean>>;

export interface WebContentMotion {
  region: RefCallback<HTMLDivElement>;
  mounted: boolean;
  height: number | undefined;
  measure: (event: LayoutChangeEvent) => void;
  onTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
}

const mayUnmount = ({ open, forceMount }: Visibility): boolean =>
  !open && !forceMount;

const measuredBody = (region: Region): Element | null | undefined =>
  region.current?.firstElementChild?.firstElementChild;

const bodyHeight = (region: Region): number | undefined =>
  measuredBody(region)?.getBoundingClientRect().height;

const drawnHeight = (region: Region): number | undefined =>
  region.current?.firstElementChild?.getBoundingClientRect().height;

function useMounted(visibility: Visibility): [boolean, SetMounted] {
  const [mounted, setMounted] = useState(!mayUnmount(visibility));

  if (visibility.open && !mounted) setMounted(true);

  return [mounted, setMounted];
}

interface Measurement {
  region: Region;
  mounted: boolean;
  setHeight: Dispatch<SetStateAction<number | undefined>>;
}

function attachRegion(node: HTMLDivElement | null, options: Measurement): void {
  options.region.current = node;

  if (node && options.mounted) options.setHeight(bodyHeight(options.region));
}

function useRegionAttachment({
  region,
  mounted,
  setHeight,
}: Measurement): RefCallback<HTMLDivElement> {
  return useCallback(
    (node: HTMLDivElement | null): void =>
      attachRegion(node, { region, mounted, setHeight }),
    [region, mounted, setHeight],
  );
}

type HeightState = [
  number | undefined,
  WebContentMotion['measure'],
  RefCallback<HTMLDivElement>,
];

function useHeight(
  region: Region,
  mounted: boolean,
  initialOpen: boolean,
): HeightState {
  const [height, setHeight] = useState<number | undefined>(
    initialOpen ? undefined : 0,
  );

  const attach = useRegionAttachment({ region, mounted, setHeight });

  return [
    height,
    (event) => setHeight(event.nativeEvent.layout.height),
    attach,
  ];
}

interface Closing {
  visibility: Visibility;
  region: Region;
  height: number | undefined;
  setMounted: SetMounted;
}

function closeAtRest({
  region,
  setMounted,
}: Pick<Closing, 'region' | 'setMounted'>): () => void {
  const frame = requestAnimationFrame(() => {
    if (!drawnHeight(region)) setMounted(false);
  });

  return () => cancelAnimationFrame(frame);
}

// A rapid reversal or reduced motion can reach zero without a transitionend event.
function useCloseAtRest(options: Closing): void {
  const reduced = useReducedMotionNow();

  const {
    visibility: { open, forceMount },
    height,
    region,
    setMounted,
  } = options;

  useEffect(() => {
    if (open || forceMount) return;

    return closeAtRest({ region, setMounted });
  }, [open, forceMount, height, reduced, region, setMounted]);
}

const isHeightEnd = (event: TransitionEvent<HTMLDivElement>): boolean =>
  event.target === event.currentTarget.firstElementChild &&
  event.propertyName === 'height';

function endMotion(
  event: TransitionEvent<HTMLDivElement>,
  options: Closing,
): void {
  if (isHeightEnd(event) && mayUnmount(options.visibility))
    options.setMounted(false);
}

// A new measurement retargets the browser transition from its current height, without React rendering each frame.
export function useWebContentMotion(visibility: Visibility): WebContentMotion {
  const region = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useMounted(visibility);
  const [height, measure, attach] = useHeight(region, mounted, visibility.open);
  const closing = { visibility, height, region, setMounted };

  useCloseAtRest(closing);

  return {
    region: attach,
    mounted,
    measure,
    height: visibility.open ? height : 0,
    onTransitionEnd: (event) => endMotion(event, closing),
  };
}
