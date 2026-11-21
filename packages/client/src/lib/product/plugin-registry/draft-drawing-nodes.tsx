import { motionDuration } from '@repo/kit/motion';
import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import type { ReactElement, ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { DraftDrawing } from './draft-drawing';

/*
 * What the registry draws of the Agent drawing a Draft (ADR-0057): a node new since the tree the App kept fades in, and
 * the region the Agent is writing wears a labelled dashed frame until it lands. Reduced motion shows both at once.
 */

const fadeIn = FadeIn.duration(motionDuration.enter);

const fadeOut = FadeOut.duration(motionDuration.frame);

// A node's own new drawing fades in; it stays wrapped afterwards, so a later draw of it does not draw its subtree again.
export function DraftFade({ children }: { children: ReactNode }): ReactElement {
  const reduced = useReducedMotionNow();

  return (
    <Animated.View entering={reduced ? undefined : fadeIn}>
      {children}
    </Animated.View>
  );
}

// "list-header" is drawn as "Drawing · List header".
export function regionLabel(region: string): string {
  const words = region.replaceAll(/[-_]+/g, ' ').trim();

  return `Drawing · ${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

type FrameProps = { region: string; active: boolean; children: ReactNode };

export function DraftFrame({
  region,
  active,
  children,
}: FrameProps): ReactElement {
  const reduced = useReducedMotionNow();

  return (
    <View testID={`draft-region-${region}`}>
      {children}
      {active ? (
        <Animated.View
          pointerEvents="none"
          testID={`draft-frame-${region}`}
          entering={reduced ? undefined : fadeIn}
          exiting={reduced ? undefined : fadeOut}
          className="absolute -inset-1 rounded-2xl border-2 border-dashed border-info"
        >
          <View className="absolute left-0 top-0 rounded-br-md bg-info px-1.5">
            <Text className="type-badge text-primary-foreground">
              {regionLabel(region)}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

// The element a node drew, new to the tree: faded in. A node that is not new is left as it drew.
export function faded(
  element: ReactElement | null,
  key: string,
  draft: DraftDrawing | undefined,
): ReactElement | null {
  if (!element || !draft?.faded.has(key)) return element;

  return <DraftFade key={element.key}>{element}</DraftFade>;
}

// The element of a node that is, or was, a region the Agent wrote: framed while it is being written.
export function framed(
  element: ReactElement | null,
  nodeKey: string,
  draft: DraftDrawing | undefined,
): ReactElement | null {
  if (!element || !draft?.regions.has(nodeKey)) return element;

  return (
    <DraftFrame
      key={element.key}
      region={nodeKey}
      active={draft.framed.has(nodeKey)}
    >
      {element}
    </DraftFrame>
  );
}
