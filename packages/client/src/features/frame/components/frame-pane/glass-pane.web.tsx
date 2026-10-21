import { Surface } from '@repo/kit/primitives/layout/surface';
import { cn } from '@repo/kit/utils';
import type { ComponentProps, ReactElement, ReactNode, RefObject } from 'react';
import type { FramePaneProps } from './frame-pane';
import { leftEdgeClip, useEdgeClip } from './pane-edge-clip.web';

type GlassPaneAttributes = ComponentProps<'div'> & { 'data-testid': string };

function glassPaneAttributes(
  props: Omit<FramePaneProps, 'children'>,
): GlassPaneAttributes {
  return {
    'data-testid': props.testID,
    style: { width: props.width },
    'aria-hidden': props.hidden,
    inert: props.hidden,
  };
}

type GlassPaneProps = Omit<FramePaneProps, 'children'> & {
  children: (edgeRef: RefObject<HTMLDivElement | null>) => ReactNode;
};

export function GlassPane({
  children,
  ...props
}: GlassPaneProps): ReactElement {
  return (
    <div {...glassPaneAttributes(props)} className="relative min-w-0 shrink-0">
      {children(useEdgeClip({ ...props, children: null }))}
    </div>
  );
}

export interface PaneMaterialProps {
  surface?: FramePaneProps['surface'];
  edgeRef?: RefObject<HTMLDivElement | null>;
  children: ReactElement;
}

// The material follows the animated viewport; its edge and rounded content clip stay inside its shadow.
export function PaneMaterial(props: PaneMaterialProps): ReactElement {
  if (!props.surface) return props.children;

  return (
    <Surface kind={props.surface} fill>
      <GlassPaneClip {...props} />
    </Surface>
  );
}

function GlassPaneClip({ edgeRef, children }: PaneMaterialProps): ReactElement {
  return (
    <div
      ref={edgeRef}
      className="relative flex-1 overflow-hidden rounded-2xl"
      style={{ clipPath: leftEdgeClip(0) }}
    >
      {children}
    </div>
  );
}

export const paneViewportClass = (
  surface: FramePaneProps['surface'],
  sliding: boolean,
): string =>
  cn(
    'absolute bottom-0 left-0 top-0',
    surface ? 'flex' : sliding && 'overflow-hidden',
  );
