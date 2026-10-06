import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import { Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import { cn } from '#lib/utils';

function Collapsible({
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  if (Platform.OS === 'web')
    return (
      <CollapsiblePrimitive.Root {...props}>
        {children}
      </CollapsiblePrimitive.Root>
    );
  return (
    <LayoutAnimationConfig skipEntering>
      <CollapsiblePrimitive.Root {...props} asChild>
        <Animated.View
          collapsable={false}
          layout={LinearTransition.duration(200).reduceMotion(
            ReduceMotion.System,
          )}
        >
          {children}
        </Animated.View>
      </CollapsiblePrimitive.Root>
    </LayoutAnimationConfig>
  );
}

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

function CollapsibleContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  if (Platform.OS === 'web') {
    return (
      <CollapsiblePrimitive.Content
        {...props}
        className={cn(
          'overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none',
          className,
        )}
      >
        {children}
      </CollapsiblePrimitive.Content>
    );
  }
  return (
    <CollapsiblePrimitive.Content {...props} asChild>
      <Animated.View
        className={className}
        entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(200).reduceMotion(ReduceMotion.System)}
      >
        {children}
      </Animated.View>
    </CollapsiblePrimitive.Content>
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
