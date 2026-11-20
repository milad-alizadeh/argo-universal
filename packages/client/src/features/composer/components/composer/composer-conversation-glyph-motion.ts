import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import { useEffect, useRef } from 'react';
import {
  interpolate,
  type SharedValue,
  useSharedValue,
} from 'react-native-reanimated';
import {
  type AnimatedStyle,
  controlIn,
  shownOpacity,
  shownScale,
} from './composer-conversation-motion';
import type { SendLayout } from './composer-toolbar-types';

// Whether the primary button offers a call, belongs to one, or does neither.
type CallPhase = 'offer' | 'call' | 'other';

const callPhases: Partial<Record<SendLayout['sendState'], CallPhase>> = {
  voice: 'offer',
  connecting: 'call',
  end: 'call',
};

const phaseOf = (sendState: SendLayout['sendState']): CallPhase =>
  callPhases[sendState] ?? 'other';

// The new glyph turns a quarter as it grows in.
const glyphTurn = -90;

// Only starting a call and ending it turn the glyph; Send and Stop change as they always have.
const crossesCall = (from: CallPhase, to: CallPhase): boolean =>
  from !== to && ![from, to].includes('other');

function useGlyphStyle(
  shown: SharedValue<number>,
  still: boolean,
): AnimatedStyle {
  return useAnimatedStyle(() => {
    const value = shown.get();
    const turn = interpolate(value, [0, 1], [glyphTurn, 0]);
    const moving = [{ scale: shownScale(value) }, { rotate: `${turn}deg` }];

    return { opacity: shownOpacity(value), transform: still ? [] : moving };
  }, [shown, still]);
}

// The new glyph starts from nothing and comes in.
function turnIn(shown: SharedValue<number>, still: boolean): number {
  shown.set(0);

  return controlIn(still);
}

/*
 * The primary button turns from the voice button into End as the call starts, and back as it ends: the new glyph
 * springs in from 60% and a quarter turn. Under reduced motion it fades in.
 */
export function useCallGlyphMorph(
  sendState: SendLayout['sendState'],
): AnimatedStyle {
  const still = useReducedMotionNow();
  const shown = useSharedValue(1);
  const phase = phaseOf(sendState);
  const last = useRef(phase);

  useEffect(() => {
    if (crossesCall(last.current, phase)) shown.set(turnIn(shown, still));

    last.current = phase;
  }, [phase, still, shown]);

  return useGlyphStyle(shown, still);
}
