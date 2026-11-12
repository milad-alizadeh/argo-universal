import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { bandWorkbench } from '#lib/product/window-band';
import { useFrameOffset } from '../hooks/use-frame-offset';
import type { PartReads, ScaffoldLayout } from './use-scaffold-layout';

type WorkbenchLayout = 'workbench' | 'motion' | 'measures';

type WorkbenchLayoutReads = Pick<ScaffoldLayout, WorkbenchLayout>;

// Cards keep their Slot and mounted tree as the width budget changes their placement.
export function ScaffoldWorkbench(
  parts: PartReads<'band', WorkbenchLayout>,
): ReactElement | null {
  const { scaffold, layout } = parts;
  const workbench = bandWorkbench(scaffold.band);

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
      <WorkbenchScroll>{children}</WorkbenchScroll>
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
  motion: { offset: number; visible: boolean };
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
    },
  };
}

const shadowScrollProps = {
  role: 'region',
  accessibilityLabel: 'Workbench overview',
  // box-none restores direct children's input, so the full-height frame must opt out explicitly.
  className: 'min-h-0 flex-1 -mx-8 -mt-8 web:pointer-events-none!',
  pointerEvents: 'box-none',
  contentContainerStyle: { pointerEvents: 'box-none' },
  contentContainerClassName: 'px-8 pt-8 pb-16 web:pointer-events-none!',
} satisfies ComponentProps<typeof ScrollView>;

/*
 * The cards have no backing of their own, so what an overlaid Workbench covers shows through their glass and nothing
 * clips them. The scroll view fades no edge: the web's fade is a mask, and a mask would make the scroll view the
 * glass's backdrop, so the cards would blur nothing of the Feed behind them.
 */
function WorkbenchScroll(props: { children: ReactNode }): ReactElement {
  return (
    <ScrollView {...shadowScrollProps}>
      <View pointerEvents="auto" className="gap-2">
        {props.children}
      </View>
    </ScrollView>
  );
}
