import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ScrollViewInstance, ViewInstance } from 'react-native';
import type { ScrollFadeViewProps } from '../../../scroll-fade/scroll-fade';
import type { InspectorBodyProps } from './inspector-pane';
import { inspectorScrollIntent } from './inspector-scroll-intent';
import { useScrollRecorder } from './inspector-scroll-recorder';
import {
  createScrollRestoration,
  type ScrollRestoration,
} from './scroll-restoration';

type State = InspectorBodyProps['scrollState'];

type LayoutHandler = NonNullable<ScrollFadeViewProps['onLayout']>;

type SizeHandler = NonNullable<ScrollFadeViewProps['onContentSizeChange']>;

type ScrollHandler = NonNullable<ScrollFadeViewProps['onScroll']>;

type Elements = {
  ref: React.RefObject<ScrollViewInstance | null>;
  contentRef: React.RefObject<ViewInstance | null>;
};

type Measures = Pick<
  ScrollFadeViewProps,
  'onLayout' | 'onContentSizeChange'
> & { onContentLayout: LayoutHandler };

type Tracking = Elements &
  Measures &
  ReturnType<typeof inspectorScrollIntent> & { onScroll: ScrollHandler };

export function useInspectorScroll(state: State): Tracking {
  const elements = useScrollElements();

  const controller = useController(state);

  const restore = useRestore(elements, controller, state);

  const onScroll = useScrollRecorder(controller, state);

  useFreshContent(elements.contentRef, controller, restore);

  return tracking(elements, controller, { state, restore, onScroll });
}

type Actions = { state: State; restore: () => void; onScroll: ScrollHandler };

function tracking(
  elements: Elements,
  controller: ScrollRestoration,
  actions: Actions,
): Tracking {
  const cancel = (): void => {
    actions.state?.onScroll(controller.cancel());
  };

  return {
    ...elements,
    ...measurements(controller, actions.restore),
    ...inspectorScrollIntent(cancel),
    onScroll: actions.onScroll,
  };
}

function useController(state: State): ScrollRestoration {
  const [controller] = useState(() =>
    createScrollRestoration(state?.getOffset() ?? 0),
  );

  return controller;
}

function useScrollElements(): Elements {
  const ref = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<ViewInstance>(null);

  return { ref, contentRef };
}

function useRestore(
  elements: Elements,
  controller: ScrollRestoration,
  state: State,
): () => void {
  return useCallback(
    () =>
      controller.restore(state?.ready, (y) => {
        elements.ref.current?.scrollTo({ y, animated: false });
        state?.onScroll(y);
      }),
    [controller, elements.ref, state],
  );
}

function useFreshContent(
  ref: Elements['contentRef'],
  controller: ScrollRestoration,
  restore: () => void,
): void {
  useLayoutEffect(() => {
    controller.boundary();

    return measureContent(ref, controller, restore);
  }, [ref, controller, restore]);
}

// Native measurement is asynchronous, so a superseded content generation cannot complete the new one's restore.
function measureContent(
  ref: Elements['contentRef'],
  controller: ScrollRestoration,
  restore: () => void,
): () => void {
  let current = true;

  ref.current?.measure((...bounds) => {
    if (!current) return;

    controller.content(bounds[3]);
    restore();
  });

  return (): void => {
    current = false;
  };
}

function measurements(
  controller: ScrollRestoration,
  restore: () => void,
): Measures {
  return {
    onLayout: onHeight(controller.viewport, restore),
    onContentLayout: onHeight(controller.content, restore),
    onContentSizeChange: onSize(controller, restore),
  };
}

const onHeight =
  (update: (height: number) => void, restore: () => void): LayoutHandler =>
  ({ nativeEvent }) => {
    update(nativeEvent.layout.height);
    restore();
  };

const onSize =
  (controller: ScrollRestoration, restore: () => void): SizeHandler =>
  (_width, height) => {
    controller.content(height);
    restore();
  };
