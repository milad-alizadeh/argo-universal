import {
  type ReactElement,
  type RefObject,
  useContext,
  useDeferredValue,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { View, type ViewInstance, type ViewStyle } from 'react-native';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';
import {
  type CollapsibleLayoutSync,
  CollapsibleContext,
  contentAccessibility,
} from './collapsible-context';
import {
  type MeasuredContent,
  type Measurement,
  useForgetWhenHidden,
  useMeasurement,
} from './collapsible-layout-measurement';
import { beginLayoutMotion, drawnHeight } from './collapsible-layout-motion';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';

/*
 * The Feed: Legend List places each row itself and hears a row's new size only after it is drawn, so a row that grew
 * on its own (on a phone's UI thread, or by the browser's transition) would overlap the rows below for a frame and
 * set the list re-laying out every frame. This content steps its height from the JS thread instead and tells the list
 * each step in the same frame, so the row and the rows below commit together.
 */

const outOfFlow = { position: 'absolute', top: 0, left: 0, right: 0 } as const;

interface Start {
  open: boolean;
  height: RefObject<number>;
  latest: RefObject<number>;
  setProgress: (progress: number) => void;
  layoutSync: CollapsibleLayoutSync;
}

function start(options: Start, reduced: boolean): (() => void) | undefined {
  const { open, height, latest } = options;
  const from = latest.current;
  const drawn = { current: drawnHeight(height.current, from) };
  const motion = { from, target: Number(open), drawn, progress: latest };

  return beginLayoutMotion({ ...options, ...motion }, reduced);
}

// Content opening for the first time measures before it moves.
function useLayoutProgress(
  open: boolean,
  { height, measured }: Measurement,
  layoutSync: CollapsibleLayoutSync,
): number {
  const reduced = useReducedMotionNow();
  const [progress, setProgress] = useState(Number(open));
  const latest = useRef(progress);
  const ready = measured || !open;

  useLayoutEffect(() => {
    if (!ready) return;

    return start({ open, height, latest, setProgress, layoutSync }, reduced);
  }, [open, ready, reduced, height, layoutSync]);

  return progress;
}

// The list measures the row once the content rests, and again once it is measured.
function useSyncAtRest(
  progress: number,
  measured: boolean,
  syncLayout: () => void,
): void {
  const resting = progress === 0 || progress === 1 ? progress : null;

  useLayoutEffect(() => {
    syncLayout();
  }, [resting, measured, syncLayout]);
}

// What the content draws from: no refs, which are read only in effects and events.
interface LayoutContent {
  open: boolean;
  progress: number;
  rendered: number;
  onLayout: Measurement['onLayout'];
}

function useLayoutContent(
  layoutSync: CollapsibleLayoutSync,
  content: MeasuredContent,
): LayoutContent {
  const open = useDeferredValue(useContext(CollapsibleContext).open);
  const measurement = useMeasurement(content, open);
  const progress = useLayoutProgress(open, measurement, layoutSync);
  const { rendered, onLayout } = measurement;

  useSyncAtRest(progress, measurement.measured, layoutSync.syncLayout);
  useForgetWhenHidden(!open && progress === 0, measurement.forget);

  return { open, progress, rendered, onLayout };
}

const isResting = ({ open, progress }: LayoutContent): boolean =>
  open && progress === 1;

const isHidden = ({ open, progress }: LayoutContent): boolean =>
  !open && progress === 0;

const clipStyle = (state: LayoutContent): ViewStyle | undefined => {
  const height = drawnHeight(state.rendered, state.progress);

  return isResting(state) ? undefined : { height, overflow: 'hidden' };
};

type Props = ContentProps & { layoutSync: CollapsibleLayoutSync };

type MovingProps = {
  state: LayoutContent;
  content: MeasuredContent;
  view: ContentProps;
};

function Moving({ state, content, view }: MovingProps): ReactElement {
  const moving = isResting(state) ? undefined : outOfFlow;

  return (
    <View
      {...view}
      ref={content}
      style={[view.style, moving]}
      onLayout={state.onLayout}
    />
  );
}

export function LayoutSyncedContent(props: Props): ReactElement | null {
  const { layoutSync, forceMount, ...view } = props;
  const content = useRef<ViewInstance>(null);
  const state = useLayoutContent(layoutSync, content);
  const { contentId } = useContext(CollapsibleContext);
  const region = { nativeID: contentId, ...contentAccessibility(state.open) };

  if (isHidden(state) && !forceMount) return null;

  return (
    <View {...region} style={clipStyle(state)}>
      <Moving state={state} content={content} view={view} />
    </View>
  );
}
