import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { VoiceLevels } from '../../voice-connection';
import { orbOn } from './orb-gl';
import { OrbMotion } from './orb-motion';
import { voiceOrbSize, type VoiceOrbProps } from './voice-orb-props';

const quiet: VoiceLevels = { input: 0, output: 0 };

const millisecondsPerSecond = 1000;

// Draws a frame at a time until stopped; each frame reads the state and the levels as they are then.
function animate(
  canvas: HTMLCanvasElement,
  read: () => VoiceOrbProps,
): () => void {
  const drawing = orbOn(canvas);

  if (!drawing) return () => {};
  const motion = new OrbMotion();
  let last = performance.now();
  let frame = 0;

  const tick = (now: number): void => {
    const { state, levels } = read();
    const seconds = (now - last) / millisecondsPerSecond;
    drawing.draw(motion.step(state, levels?.() ?? quiet, seconds));
    last = now;
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return (): void => {
    cancelAnimationFrame(frame);
    drawing.dispose();
  };
}

/*
 * ElevenLabs' orb (MIT, from ElevenLabs UI) drawn on a canvas. It is the web and desktop drawing of the Argo orb: the
 * Voice call's screen draws `VoiceOrb`, and a phone's own drawing replaces this file without the screen changing.
 */
export function VoiceOrb(props: VoiceOrbProps): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  });

  useEffect(
    () =>
      canvas.current
        ? animate(canvas.current, () => latest.current)
        : undefined,
    [],
  );

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Voice ${props.state}`}
      className="overflow-hidden rounded-full bg-tone-info-200"
      style={{ width: voiceOrbSize, height: voiceOrbSize }}
    >
      <canvas
        ref={canvas}
        width={voiceOrbSize * window.devicePixelRatio}
        height={voiceOrbSize * window.devicePixelRatio}
        style={{ width: voiceOrbSize, height: voiceOrbSize }}
      />
    </View>
  );
}
