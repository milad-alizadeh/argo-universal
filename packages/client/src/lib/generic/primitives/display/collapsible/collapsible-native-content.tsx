import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import { useContext, type ReactElement } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  contentAccessibility,
  movingContentStyle,
  OpenContext,
  type ContentProps,
} from './collapsible-context';
import { useNativeContentMotion } from './collapsible-native-motion';

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
    <CollapsiblePrimitive.Content {...props.contentProps} forceMount asChild>
      <Animated.View style={style} {...contentAccessibility(open)}>
        {children}
      </Animated.View>
    </CollapsiblePrimitive.Content>
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
export function NativeContent({
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
