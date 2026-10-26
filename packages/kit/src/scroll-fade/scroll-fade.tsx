import { useCallback, type RefObject, type JSX } from 'react';
import {
  ScrollView,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';
import { useClaimsColumn } from '#kit/column-claims';
import { cn } from '#kit/utils';
import { ScrollFadeFrame } from './scroll-fade-frame-view';
import type { ScrollFadeOptions } from './scroll-fade-options';
import { useScrollFade } from './scroll-fade-props';

export type ScrollFadeViewProps = ScrollViewProps &
  ScrollFadeOptions & {
    // Grows with its content up to the max height in `className`, then scrolls; otherwise it fills its parent. A horizontal one always fits its content's height.
    fitContent?: boolean;
    ref?: RefObject<ScrollViewInstance | null>;
  };

interface Sizing {
  frame: string;
  scroll: Pick<ScrollViewProps, 'contentInsetAdjustmentBehavior'> & {
    className: string;
  };
}

/*
 * A horizontal row is as tall as its content and narrows to its parent, scrolling what does not fit. It never takes
 * iOS's header inset: under a clear header that would push its content out of view, and keep it there.
 */
const horizontalSizing = (className: string | undefined): Sizing => ({
  frame: cn('min-w-0', className),
  scroll: { className: 'grow-0', contentInsetAdjustmentBehavior: 'never' },
});

const verticalSizing = (
  fitContent: boolean | undefined,
  className: string | undefined,
): Sizing => ({
  frame: cn('min-h-0', !fitContent && 'flex-1', className),
  scroll: { className: fitContent ? 'grow-0' : 'flex-1' },
});

type SizingProps = Pick<
  ScrollFadeViewProps,
  'fitContent' | 'horizontal' | 'className'
>;

const sizing = ({ fitContent, horizontal, className }: SizingProps): Sizing =>
  horizontal
    ? horizontalSizing(className)
    : verticalSizing(fitContent, className);

// One that fills its Screen's content keeps to the Screen's column itself; one sized by its content sits inside it.
function useSizing(props: SizingProps): Sizing {
  useClaimsColumn(!props.horizontal && !props.fitContent);

  return sizing(props);
}

// A scroll view whose content fades under each edge that hides more of it: top and bottom, or leading and trailing when `horizontal`.
export function ScrollFadeView({
  className,
  fitContent,
  ref,
  ...props
}: ScrollFadeViewProps): JSX.Element {
  const { frame, scroll, attachScrollView } = useScrollFade(props);
  const classNames = useSizing({ ...props, fitContent, className });

  const attach = useScrollRef(attachScrollView, ref);

  return (
    <ScrollFadeFrame {...frame} className={classNames.frame}>
      <ScrollView {...scroll} {...classNames.scroll} ref={attach} />
    </ScrollFadeFrame>
  );
}

function useScrollRef(
  attach: ((view: ScrollViewInstance | null) => void) | undefined,
  ref: RefObject<ScrollViewInstance | null> | undefined,
): (view: ScrollViewInstance | null) => void {
  return useCallback(
    (view) => {
      attach?.(view);

      if (ref) ref.current = view;
    },
    [attach, ref],
  );
}
