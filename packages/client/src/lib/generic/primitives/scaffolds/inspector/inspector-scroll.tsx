import { useLayoutEffect, useRef, type ReactElement } from 'react';
import type { ScrollView } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import type { InspectorBodyProps } from './inspector-pane';

export function InspectorScroll({
  scrollState,
  children,
  ...props
}: InspectorBodyProps): ReactElement {
  const tracking = useRestoredScroll(scrollState);

  return (
    <ScrollFadeView {...scrollProps(props)} {...tracking}>
      {children}
    </ScrollFadeView>
  );
}

type ScrollTracking = Pick<
  React.ComponentProps<typeof ScrollFadeView>,
  'ref' | 'onScroll' | 'onContentSizeChange'
>;

function useRestoredScroll(
  state: InspectorBodyProps['scrollState'],
): ScrollTracking {
  const ref = useRef<ScrollView>(null);
  const restore = useRestore(ref, state);
  const onScroll = useScrollRecorder(state);

  return {
    ref,
    onContentSizeChange: restore,
    onScroll,
  };
}

// React Native Web can deliver its final scroll event after the old page has unmounted.
function useScrollRecorder(
  state: InspectorBodyProps['scrollState'],
): ScrollTracking['onScroll'] {
  const mounted = useMounted();

  return (
    state &&
    ((event) => {
      if (!mounted.current) return;

      state.onScroll(event.nativeEvent.contentOffset.y);
    })
  );
}

function useMounted(): React.RefObject<boolean> {
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;

    return (): void => {
      mounted.current = false;
    };
  }, []);

  return mounted;
}

function useRestore(
  ref: React.RefObject<ScrollView | null>,
  state: InspectorBodyProps['scrollState'],
): () => void {
  const restored = useRef(false);

  return () => {
    if (restored.current || !state) return;

    restored.current = true;
    restoreOffset(ref.current, state.getOffset());
  };
}

function restoreOffset(scroll: ScrollView | null, offset: number): void {
  if (offset === 0) return;

  scroll?.scrollTo({ y: offset, animated: false });
}

const scrollProps = ({
  surface,
  fitContent,
}: InspectorBodyProps): React.ComponentProps<typeof ScrollFadeView> => ({
  testID: 'desktop-inspector-scroll',
  className: cn('overflow-hidden', fitContent && 'min-h-0 shrink'),
  contentContainerClassName: 'grow',
  fitContent,
  surfaceClassName: surface,
});
