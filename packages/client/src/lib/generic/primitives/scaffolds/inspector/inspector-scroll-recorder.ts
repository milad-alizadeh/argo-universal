import { useLayoutEffect, useRef } from 'react';
import type { ScrollFadeViewProps } from '../../../scroll-fade/scroll-fade';
import type { InspectorBodyProps } from './inspector-pane';
import type { ScrollRestoration } from './scroll-restoration';

type State = InspectorBodyProps['scrollState'];

type ScrollHandler = NonNullable<ScrollFadeViewProps['onScroll']>;

export function useScrollRecorder(
  controller: ScrollRestoration,
  state: State,
): ScrollHandler {
  const mounted = useMounted();

  return ({ nativeEvent }) => {
    if (!mounted.current) return;

    recordScroll(controller, state, nativeEvent.contentOffset.y);
  };
}

function recordScroll(
  controller: ScrollRestoration,
  state: State,
  offset: number,
): void {
  if (controller.record(offset)) state?.onScroll(offset);
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
