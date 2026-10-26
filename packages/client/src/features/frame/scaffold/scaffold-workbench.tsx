import { Surface } from '@repo/kit/primitives/layout/surface';
import { ScrollFadeView } from '@repo/kit/scroll-fade/scroll-fade';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFrameOffset } from '../hooks/use-frame-offset';
import type { ScaffoldPartProps } from './use-scaffold-layout';

// A floating Workbench overlays the content; its geometry contributes no width to the page.
export function ScaffoldWorkbench(
  parts: ScaffoldPartProps,
): ReactElement | null {
  const { scaffold, layout } = parts;
  const workbench = scaffold.band?.workbench;

  if (!workbench) return null;

  return <WorkbenchPanel layout={layout}>{workbench}</WorkbenchPanel>;
}

type WorkbenchPanelProps = {
  layout: ScaffoldPartProps['layout'];
  children: ReactNode;
};

function WorkbenchPanel({
  layout,
  children,
}: WorkbenchPanelProps): ReactElement {
  const placement = useWorkbenchPlacement(layout);

  return (
    <Animated.View {...placement}>
      <WorkbenchSurface floating={layout.workbench.state === 'floating'}>
        {children}
      </WorkbenchSurface>
    </Animated.View>
  );
}

function useWorkbenchPlacement(
  layout: ScaffoldPartProps['layout'],
): ComponentProps<typeof Animated.View> & { inert: boolean } {
  const placement = workbenchPlacement(layout);
  const motion = useFrameOffset({ ...layout.motion, ...placement.motion });

  return {
    testID: 'desktop-workbench',
    className: placement.className,
    style: [placement.style, motion],
    ...visibilityProps(placement.motion.visible),
  };
}

const visibilityProps = (visible: boolean): ViewProps & { inert: boolean } => ({
  pointerEvents: visible ? 'auto' : 'none',
  accessibilityElementsHidden: !visible,
  importantForAccessibility: visible ? 'auto' : 'no-hide-descendants',
  'aria-hidden': !visible,
  inert: !visible,
});

type WorkbenchPlacement = Pick<ViewProps, 'style' | 'className'> & {
  motion: { offset: number; visible: boolean };
};

// The panel keeps its full width while it slides out, so its cards never reflow.
function workbenchPlacement({
  workbench,
  measures,
}: ScaffoldPartProps['layout']): WorkbenchPlacement {
  const { offset } = workbench;

  return {
    className: 'absolute bottom-frame-inset',
    style: { left: offset, width: measures.workbenchWidth, top: 0 },
    motion: { offset, visible: workbench.width > 0 },
  };
}

function WorkbenchSurface({
  floating,
  children,
}: {
  floating: boolean;
  children: ReactNode;
}): ReactElement {
  return floating ? (
    <Surface kind="glass" fill>
      <WorkbenchScroll>{children}</WorkbenchScroll>
    </Surface>
  ) : (
    <WorkbenchScroll>{children}</WorkbenchScroll>
  );
}

function WorkbenchScroll({ children }: { children: ReactNode }): ReactElement {
  return (
    <ScrollFadeView
      className="-mx-8 -mt-8"
      contentContainerClassName="px-8 pt-8 pb-16"
    >
      <View className="gap-2">{children}</View>
    </ScrollFadeView>
  );
}
