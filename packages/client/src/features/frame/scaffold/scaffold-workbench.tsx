import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { ScrollView } from '#primitives/layout/scroll-view';
import { Surface } from '#primitives/layout/surface';
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

function workbenchPlacement({ frame }: ScaffoldPartProps['layout']): {
  style: ViewStyle;
} {
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
    <Surface kind="glass">
      <WorkbenchScroll>{children}</WorkbenchScroll>
    </Surface>
  ) : (
    <WorkbenchScroll>{children}</WorkbenchScroll>
  );
}

function WorkbenchScroll({ children }: { children: ReactNode }): ReactElement {
  return (
    <ScrollView>
      <View className="gap-2 p-2">{children}</View>
    </ScrollView>
  );
}
