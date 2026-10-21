import type * as React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { FramePaneProps } from './frame-pane';
import {
  GlassPane,
  PaneMaterial,
  paneViewportClass,
  type PaneMaterialProps,
} from './glass-pane.web';
import { leftEdgeClip, useEdgeClip } from './pane-edge-clip.web';
import { type PaneGeometry, usePaneGeometry } from './pane-geometry';
import type { PaneRefs } from './pane-motion.web';
import { ReflowingText, SlidingText } from './pane-text.web';
import { slideStyle } from './slide-style';
import { usePaneMotion } from './use-pane-motion.web';

interface PaneViewportProps
  extends PaneRefs, Omit<PaneMaterialProps, 'children'> {
  testID: string;
  geometry: PaneGeometry;
  children: ReactNode;
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

// The content takes its final width at once, or keeps its last one while it hides, and only slides and fades (FLIP), so it lays out once per change.
function reflowingStyle({ contentWidth, hidden }: PaneGeometry): CSSProperties {
  return {
    width: contentWidth,
    opacity: hidden ? 0 : 1,
    willChange: 'transform, opacity',
  };
}

function ReflowingViewport(input: PaneViewportProps): React.JSX.Element {
  const { frameRef, ...props } = input;

  return (
    <div
      ref={frameRef}
      className={paneViewportClass(props.surface, false)}
      style={reflowingStyle(props.geometry)}
    >
      <PaneMaterial {...props}>
        <ReflowingContent {...props} />
      </PaneMaterial>
    </div>
  );
}

function slidingStyle({ width, contentWidth }: PaneGeometry): CSSProperties {
  return {
    ...slideStyle(width, contentWidth),
    willChange: 'transform, opacity',
  };
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

function SlidingViewport(input: PaneViewportProps): React.JSX.Element {
  const { viewportRef, ...props } = input;

  return (
    <div
      ref={viewportRef}
      data-testid={`${props.testID}-viewport`}
      className={paneViewportClass(props.surface, true)}
      style={{ width: props.geometry.frameWidth, willChange: 'transform' }}
    >
      <PaneMaterial {...props}>
        <SlidingContent {...props} />
      </PaneMaterial>
    </div>
  );
}

interface PaneState {
  geometry: PaneGeometry;
  reflows: boolean;
  refs: PaneRefs;
}

function usePane(props: FramePaneProps): PaneState {
  const geometry = usePaneGeometry(props);
  // Content that reflows with the pane lays out at its new width and slides there; content with a width of its own slides as the pane's edge moves.
  const reflows = props.contentWidth === undefined;
  const animate = props.animate ?? true;

  const refs = usePaneMotion(geometry, {
    animate,
    reflows,
    timing: props.timing,
  });

  return { geometry, reflows, refs };
}

function PaneViewport(
  props: FramePaneProps & Pick<PaneMaterialProps, 'edgeRef'>,
): React.JSX.Element {
  const { geometry, reflows, refs } = usePane(props);
  const Viewport = reflows ? ReflowingViewport : SlidingViewport;
  const { testID, surface, edgeRef, children } = props;

  return (
    <Viewport {...refs} {...{ testID, geometry, surface, edgeRef }}>
      {children}
    </Viewport>
  );
}

function BareFramePane(props: FramePaneProps): React.JSX.Element {
  return (
    <div
      ref={useEdgeClip(props)}
      data-testid={props.testID}
      className="relative min-w-0 shrink-0"
      style={{ width: props.width, clipPath: leftEdgeClip(0) }}
      aria-hidden={props.hidden}
      inert={props.hidden}
    >
      <PaneViewport {...props} />
    </div>
  );
}

export function FramePane(props: FramePaneProps): React.JSX.Element {
  return props.surface ? (
    <GlassPane {...props}>
      {(edgeRef) => <PaneViewport {...props} edgeRef={edgeRef} />}
    </GlassPane>
  ) : (
    <BareFramePane {...props} />
  );
}
