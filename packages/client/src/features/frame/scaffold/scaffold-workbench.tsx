import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { Surface } from '@repo/kit/primitives/layout/surface';
import { bandWorkbench } from '#lib/product/window-band';
import { useFrameSlide } from '../hooks/use-frame-offset';
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
  return (
    <Animated.View {...useWorkbenchPlacement(layout)}>
      <WorkbenchScroll>{children}</WorkbenchScroll>
    </Animated.View>
  );
}

type PanelProps = ComponentProps<typeof Animated.View> & { inert: boolean };

// The panel slides in without fading, since a translucent panel would stop its cards' frost blurring the page under them, and fades as it slides out.
function useWorkbenchPlacement(layout: WorkbenchLayoutReads): PanelProps {
  const placement = workbenchPlacement(layout);
  const { visible } = placement.motion;

  const { style, ...slide } = useFrameSlide({
    ...layout.motion,
    ...placement.motion,
  });

  return {
    ...slide,
    testID: 'desktop-workbench',
    className: placement.className,
    style: [placement.style, style, !visible && { opacity: 0 }],
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

// The panel keeps a card's full width while it slides out, so its cards never reflow; only a page narrower than a card narrows it, so it never reaches under the Inspector.
function workbenchPlacement({
  workbench,
  measures,
}: WorkbenchLayoutReads): WorkbenchPlacement {
  const { offset } = workbench;
  const width = workbench.width || measures.workbenchWidth;

  return {
    className: 'absolute bottom-frame-inset',
    style: { left: offset, width, top: 0 },
    motion: {
      offset,
      visible: workbench.width > 0,
    },
  };
}

const scrollProps = {
  role: 'region',
  accessibilityLabel: 'Workbench overview',
  className: 'grow-0',
} satisfies ComponentProps<typeof ScrollView>;

/*
 * One glass panel holds every card, as the Inspector's does, each card a section parted from the next by a hairline.
 * It takes its cards' height up to the column's and scrolls past that.
 */
function WorkbenchScroll(props: { children: ReactNode }): ReactElement {
  return (
    <View pointerEvents="auto" className="max-h-full">
      <Surface kind="glass">
        <View className="overflow-hidden rounded-2xl">
          <ScrollView {...scrollProps}>{props.children}</ScrollView>
        </View>
      </Surface>
    </View>
  );
}
