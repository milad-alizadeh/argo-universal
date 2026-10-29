import { Surface } from '@repo/kit/primitives/layout/surface';
import { ScrollFadeView } from '@repo/kit/scroll-fade/scroll-fade';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFrameOffset } from '../hooks/use-frame-offset';
import type { PartReads, ScaffoldLayout } from './use-scaffold-layout';

type WorkbenchLayout = 'workbench' | 'motion' | 'measures';

type WorkbenchLayoutReads = Pick<ScaffoldLayout, WorkbenchLayout>;

// Cards keep their Slot and mounted tree as the width budget changes their placement.
export function ScaffoldWorkbench(
  parts: PartReads<'band', WorkbenchLayout>,
): ReactElement | null {
  const { scaffold, layout } = parts;
  const workbench = scaffold.band?.workbench;

  if (!workbench) return null;

  return <WorkbenchPanel layout={layout}>{workbench}</WorkbenchPanel>;
}

type WorkbenchPanelProps = {
  layout: WorkbenchLayoutReads;
  children: ReactNode;
};

function WorkbenchPanel({
  layout,
  children,
}: WorkbenchPanelProps): ReactElement {
  const placement = useWorkbenchPlacement(layout);

  return (
    <Animated.View {...placement}>
      <WorkbenchSurface floating={layout.workbench.state === 'dedicated'}>
        {children}
      </WorkbenchSurface>
    </Animated.View>
  );
}

function useWorkbenchPlacement(
  layout: WorkbenchLayoutReads,
): ComponentProps<typeof Animated.View> & { inert: boolean } {
  const placement = workbenchPlacement(layout);
  const visible = placement.motion.visible;
  const motion = useFrameOffset({ ...layout.motion, ...placement.motion });

  return {
    testID: 'desktop-workbench',
    className: placement.className,
    style: [placement.style, motion, !visible && { opacity: 0 }],
    ...visibilityProps(visible),
  };
}

const visibilityProps = (visible: boolean): ViewProps & { inert: boolean } => ({
  pointerEvents: visible ? 'box-none' : 'none',
  accessibilityElementsHidden: !visible,
  importantForAccessibility: visible ? 'auto' : 'no-hide-descendants',
  'aria-hidden': !visible,
  inert: !visible,
});

type WorkbenchPlacement = Pick<ViewProps, 'style' | 'className'> & {
  motion: { offset: number; visible: boolean; replacesPrimary: boolean };
};

// The panel keeps its full width while it slides out, so its cards never reflow.
function workbenchPlacement({
  workbench,
  measures,
}: WorkbenchLayoutReads): WorkbenchPlacement {
  const { offset } = workbench;

  return {
    className: 'absolute bottom-frame-inset',
    style: { left: offset, width: measures.workbenchWidth, top: 0 },
    motion: {
      offset,
      visible: workbench.width > 0,
      replacesPrimary: workbench.state === 'dedicated',
    },
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

const shadowScrollProps = {
  role: 'region',
  accessibilityLabel: 'Workbench overview',
  // box-none restores direct children's input, so the full-height frame must opt out explicitly.
  className: '-mx-8 -mt-8 web:pointer-events-none!',
  pointerEvents: 'box-none',
  contentContainerStyle: { pointerEvents: 'box-none' },
  contentContainerClassName: 'px-8 pt-8 pb-16',
} satisfies ComponentProps<typeof ScrollFadeView>;

function WorkbenchScroll({ children }: { children: ReactNode }): ReactElement {
  return (
    <ScrollFadeView {...shadowScrollProps}>
      <View pointerEvents="auto" className="gap-2">
        {children}
      </View>
    </ScrollFadeView>
  );
}
