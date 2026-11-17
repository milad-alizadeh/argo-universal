import {
  useEffect,
  useCallback,
  useState,
  type Dispatch,
  type RefCallback,
  type SetStateAction,
  type TransitionEvent,
} from 'react';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';
import {
  type HeightState,
  type Region,
  useHeight,
} from './collapsible-web-height';

interface Visibility {
  open: boolean;
  forceMount?: true;
}

type SetMounted = Dispatch<SetStateAction<boolean>>;

export interface WebContentMotion {
  region: RefCallback<HTMLDivElement>;
  mounted: boolean;
  height: number | undefined;
  // Whether the content is opening or closing; only then does its height animate.
  moving: boolean;
  measure: HeightState['measure'];
  onTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
}

const mayUnmount = ({ open, forceMount }: Visibility): boolean =>
  !open && !forceMount;

const drawnHeight = (region: Region): number | undefined =>
  region.current?.firstElementChild?.getBoundingClientRect().height;

function useMounted(visibility: Visibility): [boolean, SetMounted] {
  const [mounted, setMounted] = useState(!mayUnmount(visibility));

  if (visibility.open && !mounted) setMounted(true);

  return [mounted, setMounted];
}

type SetMoving = () => void;

/*
 * Opening or closing moves the content; a change in what open content holds, such as another Session's rows,
 * takes its new height at once. Reduced motion never moves it.
 */
function useMoving(open: boolean): [boolean, SetMoving] {
  const reduced = useReducedMotionNow();
  const [motion, setMotion] = useState({ open, moving: false });

  if (motion.open !== open) setMotion({ open, moving: !reduced });

  const rest = useCallback(
    () => setMotion((now) => (now.moving ? { ...now, moving: false } : now)),
    [],
  );

  return [motion.open === open ? motion.moving : !reduced, rest];
}

interface Closing {
  visibility: Visibility;
  region: Region;
  height: number | undefined;
  setMounted: SetMounted;
  setMoving: SetMoving;
}

function closeAtRest({
  region,
  setMounted,
  setMoving,
}: Pick<Closing, 'region' | 'setMounted' | 'setMoving'>): () => void {
  const frame = requestAnimationFrame(() => {
    if (drawnHeight(region)) return;

    setMounted(false);
    setMoving();
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
    setMoving,
  } = options;

  useEffect(() => {
    if (open || forceMount) return;

    return closeAtRest({ region, setMounted, setMoving });
  }, [open, forceMount, height, reduced, region, setMounted, setMoving]);
}

const isHeightEnd = (event: TransitionEvent<HTMLDivElement>): boolean =>
  event.target === event.currentTarget.firstElementChild &&
  event.propertyName === 'height';

function endMotion(
  event: TransitionEvent<HTMLDivElement>,
  options: Closing,
): void {
  if (!isHeightEnd(event)) return;

  options.setMoving();

  if (mayUnmount(options.visibility)) options.setMounted(false);
}

type MotionState = Pick<Closing, 'setMounted' | 'setMoving'> &
  Pick<WebContentMotion, 'mounted' | 'moving'>;

function useMotionState(visibility: Visibility): MotionState {
  const [mounted, setMounted] = useMounted(visibility);
  const [moving, setMoving] = useMoving(visibility.open);

  return { mounted, setMounted, moving, setMoving };
}

// A new measurement retargets the browser transition from its current height, without React rendering each frame.
export function useWebContentMotion(visibility: Visibility): WebContentMotion {
  const state = useMotionState(visibility);
  const box = useHeight(state.mounted, visibility.open);
  const closing = { ...state, ...box, visibility };

  useCloseAtRest(closing);

  return {
    mounted: state.mounted,
    moving: state.moving,
    region: box.attach,
    measure: box.measure,
    height: visibility.open ? box.height : 0,
    onTransitionEnd: (event) => endMotion(event, closing),
  };
}
