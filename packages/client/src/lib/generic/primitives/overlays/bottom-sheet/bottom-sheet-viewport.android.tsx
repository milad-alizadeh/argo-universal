import { Box, RNHostView } from '@expo/ui/jetpack-compose';
import {
  fillMaxHeight,
  fillMaxWidth,
  onGloballyPositioned,
  onWindowInsetsChanged,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';
import type * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SheetWidth } from './bottom-sheet-width';

type ContentLayout = { y: number; height: number };

type ViewportProps = {
  fit?: boolean;
  children: (height?: number) => React.ReactElement;
};

type VisibleArea = {
  height: number | undefined;
  modifiers: ReturnType<typeof fillMaxHeight>[];
};

export function SheetViewport(props: ViewportProps): React.JSX.Element {
  const { height, modifiers } = useVisibleContent();
  const hostModifiers = props.fit ? [fillMaxWidth()] : [fillMaxHeight()];
  return (
    <Box modifiers={props.fit ? [fillMaxWidth()] : modifiers}>
      <RNHostView matchContents={props.fit} modifiers={hostModifiers}>
        <SheetWidth fit={props.fit}>
          <SheetBody {...props} height={height} />
        </SheetWidth>
      </RNHostView>
    </Box>
  );
}

function useVisibleContent(): VisibleArea {
  const window = useWindowDimensions();
  const [layout, setLayout] = useState<ContentLayout>();
  const [bottomInset, setBottomInset] = useState(0);
  const height = visibleHeight(layout, window.height, bottomInset);
  const modifiers = [
    fillMaxHeight(),
    onGloballyPositioned((next) =>
      setLayout((current) => (sameLayout(current, next) ? current : next)),
    ),
    onWindowInsetsChanged((insets) => setBottomInset(insets.bottom)),
  ];
  return { height, modifiers };
}

function visibleHeight(
  layout: ContentLayout | undefined,
  windowHeight: number,
  bottomInset: number,
): number | undefined {
  if (!layout) return undefined;
  return Math.max(
    0,
    Math.min(layout.height, windowHeight - layout.y - bottomInset),
  );
}

function sameLayout(
  current: ContentLayout | undefined,
  next: ContentLayout,
): boolean {
  return current?.height === next.height && current.y === next.y;
}

function VisibleContent(props: {
  height: number | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View collapsable={false} className="flex-1">
      <View collapsable={false} style={{ height: props.height }}>
        {props.children}
      </View>
    </View>
  );
}

function SheetBody(
  props: ViewportProps & { height: number | undefined },
): React.JSX.Element {
  return props.fit ? (
    props.children()
  ) : (
    <VisibleContent height={props.height}>
      {props.children(props.height)}
    </VisibleContent>
  );
}
