import { Box, RNHostView } from '@expo/ui/jetpack-compose';
import {
  fillMaxHeight,
  fillMaxWidth,
  imePadding,
  onGloballyPositioned,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';
import type * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetWidth } from './bottom-sheet-width';

type ContentLayout = { y: number; height: number };

type ViewportProps = {
  fit?: boolean;
  children: (height?: number) => React.ReactElement;
};

type HostLayout = React.ComponentProps<typeof RNHostView>['onLayout'];

type VisibleArea = {
  height: number | undefined;
  modifiers: ReturnType<typeof fillMaxHeight>[];
  onHostLayout: HostLayout;
};

export function SheetViewport(props: ViewportProps): React.JSX.Element {
  const { height, modifiers, onHostLayout } = useVisibleContent();

  return (
    <Box modifiers={props.fit ? [fillMaxWidth()] : modifiers}>
      <RNHostView {...hostProps(props.fit, onHostLayout)}>
        <SheetWidth fit={props.fit}>
          <SheetBody {...props} height={height} />
        </SheetWidth>
      </RNHostView>
    </Box>
  );
}

function hostProps(
  fit: boolean | undefined,
  onLayout: HostLayout,
): Omit<React.ComponentProps<typeof RNHostView>, 'children'> {
  if (fit) return { matchContents: true, modifiers: [fillMaxWidth()] };

  return { modifiers: [fillMaxHeight()], onLayout };
}

/*
 * The Box reports its full area before Compose's stock `imePadding()`; the
 * hosted view fills what is left, so the difference is the keyboard.
 */
function useVisibleContent(): VisibleArea {
  const windowHeight = useWindowDimensions().height;
  const navigationBar = useSafeAreaInsets().bottom;
  const { layout, modifiers } = useSheetLayout();
  const [hostHeight, setHostHeight] = useState<number>();
  const input = { layout, hostHeight, windowHeight, navigationBar };

  return {
    height: visibleHeight(input),
    modifiers,
    onHostLayout: (event) => setHostHeight(event.nativeEvent.layout.height),
  };
}

function useSheetLayout(): Pick<VisibleArea, 'modifiers'> & {
  layout: ContentLayout | undefined;
} {
  const [layout, setLayout] = useState<ContentLayout>();

  const modifiers = [
    fillMaxHeight(),
    onGloballyPositioned((next) =>
      setLayout((current) => (sameLayout(current, next) ? current : next)),
    ),
    imePadding(),
  ];

  return { layout, modifiers };
}

interface VisibleHeightInput {
  layout: ContentLayout | undefined;
  hostHeight: number | undefined;
  windowHeight: number;
  navigationBar: number;
}

function visibleHeight(input: VisibleHeightInput): number | undefined {
  const { layout, windowHeight } = input;

  if (!layout) return undefined;

  const available = Math.min(layout.height, input.hostHeight ?? layout.height);
  const keyboard = layout.height - available;
  const bottomInset = Math.max(keyboard, input.navigationBar);

  return Math.max(
    0,
    Math.min(available, windowHeight - layout.y - bottomInset),
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
