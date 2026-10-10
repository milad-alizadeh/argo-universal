import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import {
  useContext,
  useDeferredValue,
  useLayoutEffect,
  type ReactElement,
} from 'react';
import { View } from 'react-native';
import {
  contentAccessibility,
  movingContentStyle,
  OpenContext,
  type ContentProps,
  type CollapsibleLayoutSync,
} from './collapsible-context';
import { useLayoutMotion } from './collapsible-layout-motion';
import { useContentMeasurement } from './collapsible-measurement';

type LayoutContentProps = ContentProps & { layoutSync: CollapsibleLayoutSync };
type Measurement = ReturnType<typeof useContentMeasurement>;
interface LayoutContentState {
  open: boolean;
  progress: number;
  measurement: Measurement;
}
function layoutMotionOptions(
  open: boolean,
  measurement: Measurement,
  layoutSync: CollapsibleLayoutSync,
): Parameters<typeof useLayoutMotion>[0] {
  return {
    open,
    measured: measurement.measured,
    contentHeight: measurement.contentHeight,
    layoutSync,
  };
}
function useLayoutContent(
  layoutSync: CollapsibleLayoutSync,
): LayoutContentState {
  const open = useDeferredValue(useContext(OpenContext));
  const measurement = useContentMeasurement(open);
  const progress = useLayoutMotion(
    layoutMotionOptions(open, measurement, layoutSync),
  );
  const stillAt = progress === 0 || progress === 1 ? progress : null;
  const { syncLayout } = layoutSync;
  useLayoutEffect(() => {
    syncLayout();
  }, [stillAt, measurement.measured, syncLayout]);
  return { open, progress, measurement };
}
type MeasuredContentProps = {
  state: LayoutContentState;
  className?: string;
  children: ContentProps['children'];
};
function MeasuredContent({
  state,
  className,
  children,
}: MeasuredContentProps): ReactElement {
  const { content, onLayout } = state.measurement;
  const style =
    state.open && state.progress === 1 ? undefined : movingContentStyle;
  return (
    <View ref={content} className={className} style={style} onLayout={onLayout}>
      {children}
    </View>
  );
}
type ContentHeightProps = {
  contentProps: ContentProps;
  state: LayoutContentState;
  children: ReactElement;
};
function contentHeightStyle(
  state: LayoutContentState,
): { height: number; overflow: 'hidden' } | undefined {
  if (state.open && state.progress === 1) return;
  return {
    height: state.measurement.renderedHeight * state.progress,
    overflow: 'hidden',
  };
}
function ContentHeight(options: ContentHeightProps): ReactElement {
  const { state, children, contentProps } = options;
  const style = contentHeightStyle(state);
  return (
    <CollapsiblePrimitive.Content {...contentProps} forceMount asChild>
      <View style={style} {...contentAccessibility(state.open)}>
        {children}
      </View>
    </CollapsiblePrimitive.Content>
  );
}
function isContentHidden(
  state: LayoutContentState,
  forceMount?: boolean,
): boolean {
  return !state.open && state.progress === 0 && !forceMount;
}
export function LayoutSyncedContent(
  options: LayoutContentProps,
): ReactElement | null {
  const { children, className, forceMount, layoutSync, ...props } = options;
  const state = useLayoutContent(layoutSync);
  if (isContentHidden(state, forceMount)) return null;
  return renderLayoutContent(state, { children, className, ...props });
}
function renderLayoutContent(
  state: LayoutContentState,
  { children, className, ...props }: ContentProps,
): ReactElement {
  return (
    <ContentHeight state={state} contentProps={props}>
      <MeasuredContent state={state} className={className}>
        {children}
      </MeasuredContent>
    </ContentHeight>
  );
}
