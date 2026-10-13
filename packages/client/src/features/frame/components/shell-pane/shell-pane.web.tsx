import type * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { View } from 'react-native';
import { type PaneGeometry, usePaneGeometry } from './pane-geometry';
import type { PaneRefs } from './pane-motion.web';
import type { ShellPaneProps } from './shell-pane';
import { slideStyle } from './slide-style';
import { usePaneMotion } from './use-pane-motion.web';

interface PaneViewportProps extends PaneRefs {
  testID: string;
  geometry: PaneGeometry;
  children: ReactNode;
}

type SlidingTextProps = Pick<
  PaneViewportProps,
  'testID' | 'geometry' | 'children'
>;

function ReflowingText({
  testID,
  children,
}: Pick<PaneViewportProps, 'testID' | 'children'>): React.JSX.Element {
  return (
    <View testID={`${testID}-content`} className="flex-1 h-full w-full">
      {children}
    </View>
  );
}

function ReflowingContent({
  viewportRef,
  ...props
}: Omit<PaneViewportProps, 'frameRef'>): React.JSX.Element {
  return (
    <div
      ref={viewportRef}
      data-testid={`${props.testID}-viewport`}
      className="absolute inset-0 overflow-hidden"
    >
      <ReflowingText {...props} />
    </div>
  );
}

function ReflowingViewport({
  frameRef,
  ...props
}: PaneViewportProps): React.JSX.Element {
  return (
    <div
      ref={frameRef}
      className="absolute bottom-0 left-0 top-0"
      style={{ width: props.geometry.width, willChange: 'transform, width' }}
    >
      <ReflowingContent {...props} />
    </div>
  );
}

function slidingStyle({ width, contentWidth }: PaneGeometry): CSSProperties {
  return {
    ...slideStyle(width, contentWidth),
    willChange: 'transform, opacity',
  };
}

function SlidingText({
  testID,
  geometry,
  children,
}: SlidingTextProps): React.JSX.Element {
  return (
    <View
      testID={`${testID}-content`}
      className="flex-1 h-full"
      style={{ width: geometry.contentWidth }}
    >
      {children}
    </View>
  );
}

function SlidingContent({
  slideRef,
  ...props
}: Omit<PaneViewportProps, 'viewportRef'>): React.JSX.Element {
  return (
    <div ref={slideRef} className="h-full" style={slidingStyle(props.geometry)}>
      <SlidingText {...props} />
    </div>
  );
}

function SlidingViewport({
  viewportRef,
  ...props
}: PaneViewportProps): React.JSX.Element {
  return (
    <div
      ref={viewportRef}
      data-testid={`${props.testID}-viewport`}
      className="absolute bottom-0 left-0 top-0 overflow-hidden"
      style={{ width: props.geometry.frameWidth, willChange: 'transform' }}
    >
      <SlidingContent {...props} />
    </div>
  );
}

function usePane(props: ShellPaneProps): {
  geometry: PaneGeometry;
  reflows: boolean;
  refs: PaneRefs;
} {
  const geometry = usePaneGeometry(props);
  // Content that reflows with the pane needs real width; a transform would move it twice.
  const reflows = props.contentWidth === undefined;
  const animate = props.animate ?? true;
  const refs = usePaneMotion(geometry, { animate, reflows });
  return { geometry, reflows, refs };
}

function PaneViewport(props: ShellPaneProps): React.JSX.Element {
  const { geometry, reflows, refs } = usePane(props);
  const Viewport = reflows ? ReflowingViewport : SlidingViewport;
  return (
    <Viewport {...refs} testID={props.testID} geometry={geometry}>
      {props.children}
    </Viewport>
  );
}

export function ShellPane(props: ShellPaneProps): React.JSX.Element {
  return (
    <div
      data-testid={props.testID}
      className="relative min-w-0 shrink-0"
      style={{ width: props.width }}
      aria-hidden={props.hidden}
      inert={props.hidden}
    >
      <PaneViewport {...props} />
    </div>
  );
}
