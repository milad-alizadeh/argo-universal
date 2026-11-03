import {
  type ComponentProps,
  type ReactElement,
  type RefObject,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { View, type ViewInstance } from 'react-native';
import {
  CollapsibleContext,
  contentAccessibility,
} from './collapsible-context';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';

type RegionRef = RefObject<ViewInstance | null>;

// The browser's transitions on the region, which a close waits for; reduced motion has none, so it closes at once.
async function settled(region: RegionRef): Promise<void> {
  const node = region.current;

  if (!(node instanceof HTMLElement)) return;

  await Promise.allSettled(
    node.getAnimations().map((motion) => motion.finished),
  );
}

// Closed content stays mounted until its close has finished, and a reopening on the way keeps it.
function useMounted(open: boolean, region: RegionRef): boolean {
  const [mounted, setMounted] = useState(open);
  const latestOpen = useRef(open);

  if (open && !mounted) setMounted(true);

  useLayoutEffect(() => {
    latestOpen.current = open;

    if (!open) void settled(region).then(() => setMounted(latestOpen.current));
  }, [open, region]);

  return mounted;
}

const regionClass = (open: boolean): string =>
  `grid grid-cols-1 transition-grid-rows duration-200 ease-out motion-reduce:transition-none ${open ? 'grid-rows-content' : 'grid-rows-shut'}`;

/*
 * The region's one grid row moves between `0fr` and `1fr`. The browser sizes that row from the content as it lays it
 * out, so content that grows or shrinks while the row moves is followed in the same frame, with nothing to measure.
 * The caller's padding sits inside the clipped row, so a close reaches zero.
 */
interface Region {
  open: boolean;
  mounted: boolean;
  region: ComponentProps<typeof View>;
}

function useRegion(): Region {
  const { open, contentId } = useContext(CollapsibleContext);
  const ref = useRef<ViewInstance>(null);
  const mounted = useMounted(open, ref);

  // `inert` keeps closed content, which a forced mount leaves in the tree, out of the Tab order.
  const region = {
    ref,
    nativeID: contentId,
    ...contentAccessibility(open),
    inert: !open,
  };

  return { open, mounted, region };
}

export function DrawnContent(props: ContentProps): ReactElement {
  const { forceMount, ...view } = props;
  const { open, mounted, region } = useRegion();

  return (
    <View {...region} className={regionClass(open)}>
      <Clipped shown={mounted || Boolean(forceMount)} content={view} />
    </View>
  );
}

// The grid row's one item may shrink below its content, which it clips.
function Clipped(props: {
  shown: boolean;
  content: ContentProps;
}): ReactElement {
  return (
    <View className="min-h-0 overflow-hidden">
      {props.shown ? <View {...props.content} /> : null}
    </View>
  );
}
