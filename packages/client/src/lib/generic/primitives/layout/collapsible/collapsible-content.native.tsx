import { type ComponentType, type ReactElement, useContext } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  CollapsibleLayoutSyncContext,
  contentAccessibility,
  movingContentStyle,
  OpenContext,
} from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import { useNativeContentMotion } from './collapsible-native-motion';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';
import { CollapsibleRegion } from './collapsible-region';

type NativeMotion = ReturnType<typeof useNativeContentMotion>;

type NativeHeightProps = {
  contentProps: ContentProps;
  motion: NativeMotion;
  open: boolean;
  children: ReactElement;
};

function NativeHeight(props: NativeHeightProps): ReactElement {
  const { motion, open, children } = props;
  const style = useNativeHeightStyle(motion);

  return (
    <CollapsibleRegion contentProps={props.contentProps}>
      <Animated.View style={style} {...contentAccessibility(open)}>
        {children}
      </Animated.View>
    </CollapsibleRegion>
  );
}

type NativeHeightStyle = { height: number; overflow: 'hidden' };

function useNativeHeightStyle({
  height,
  progress,
}: NativeMotion): ReturnType<typeof useAnimatedStyle<NativeHeightStyle>> {
  return useAnimatedStyle(
    () => ({ height: height.get() * progress.get(), overflow: 'hidden' }),
    [height, progress],
  );
}

type NativeMeasuredContentProps = {
  motion: NativeMotion;
  className?: string;
  children: ContentProps['children'];
};

function NativeMeasuredContent({
  motion,
  className,
  children,
}: NativeMeasuredContentProps): ReactElement {
  return (
    <View
      className={className}
      style={movingContentStyle}
      onLayout={motion.onLayout}
    >
      {children}
    </View>
  );
}

function NativeContent({
  children,
  className,
  forceMount,
  ...props
}: ContentProps): ReactElement | null {
  const open = useContext(OpenContext);
  const motion = useNativeContentMotion({ open, forceMount });

  if (!motion.mounted && !forceMount) return null;

  return renderNativeContent(motion, open, { children, className, ...props });
}

function renderNativeContent(
  motion: NativeMotion,
  open: boolean,
  { children, className, ...props }: ContentProps,
): ReactElement {
  return (
    <NativeHeight motion={motion} open={open} contentProps={props}>
      <NativeMeasuredContent motion={motion} className={className}>
        {children}
      </NativeMeasuredContent>
    </NativeHeight>
  );
}

// A phone animates the content's measured height; a layout-synced list animates with its rows instead.
export function CollapsibleContent(props: ContentProps): ReactElement | null {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);

  if (layoutSync)
    return <LayoutSyncedContent {...props} layoutSync={layoutSync} />;

  return <NativeContent {...props} />;
}

CollapsibleContent satisfies ComponentType<ContentProps>;
