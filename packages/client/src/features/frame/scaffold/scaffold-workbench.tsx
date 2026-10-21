import type { ReactElement, ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { Surface } from '#primitives/layout/surface';
import { ScrollFadeView } from '../../../lib/generic/scroll-fade/scroll-fade';
import type { ScaffoldPartProps } from './use-scaffold-layout';

// A floating Workbench overlays the content; its geometry contributes no width to the page.
export function ScaffoldWorkbench(
  parts: ScaffoldPartProps,
): ReactElement | null {
  const { scaffold, layout } = parts;

  if (!layout.frame.workbench.width) return null;

  return (
    <WorkbenchPanel layout={layout}>{scaffold.band?.workbench}</WorkbenchPanel>
  );
}

type WorkbenchPanelProps = {
  layout: ScaffoldPartProps['layout'];
  children: ReactNode;
};

function WorkbenchPanel({
  layout,
  children,
}: WorkbenchPanelProps): ReactElement {
  return (
    <View testID="desktop-workbench" {...workbenchPlacement(layout)}>
      <WorkbenchSurface floating={layout.frame.workbenchState === 'floating'}>
        {children}
      </WorkbenchSurface>
    </View>
  );
}

type WorkbenchPlacement = Pick<ViewProps, 'style' | 'className'>;

function workbenchPlacement({
  frame,
}: ScaffoldPartProps['layout']): WorkbenchPlacement {
  return {
    className: 'absolute bottom-frame-inset',
    style: {
      left: frame.workbench.offset,
      width: frame.workbench.width,
      top: 0,
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

function WorkbenchScroll({ children }: { children: ReactNode }): ReactElement {
  return (
    <ScrollFadeView
      className="-mx-4 -mt-4"
      contentContainerClassName="px-4 pt-4 pb-8"
    >
      <View className="gap-2">{children}</View>
    </ScrollFadeView>
  );
}
