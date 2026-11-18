import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { VoiceLevels } from '../../voice-connection';
import { orbOn, type OrbGl } from './orb-gl';
import { OrbMotion } from './orb-motion';
import { voiceOrbSize, type VoiceOrbProps } from './voice-orb-props';

const quiet: VoiceLevels = { input: 0, output: 0 };

const millisecondsPerSecond = 1000;

// Draws a frame at a time until stopped; each frame reads the state and the levels as they are then.
class OrbLoop {
  private readonly motion = new OrbMotion();
  private last = performance.now();
  private frame = 0;

  public constructor(
    private readonly drawing: OrbGl,
    private readonly read: () => VoiceOrbProps,
  ) {}

  public start(): void {
    this.frame = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    cancelAnimationFrame(this.frame);
    this.drawing.dispose();
  }

  private readonly tick = (now: number): void => {
    const { state, levels } = this.read();
    const seconds = (now - this.last) / millisecondsPerSecond;
    this.drawing.draw(this.motion.step(state, levels?.() ?? quiet, seconds));
    this.last = now;
    this.start();
  };
}

// A loop on the canvas, or none where the window has no WebGL2.
function loopOn(
  canvas: HTMLCanvasElement | null,
  read: () => VoiceOrbProps,
): OrbLoop | undefined {
  const drawing = canvas && orbOn(canvas);

  return drawing ? new OrbLoop(drawing, read) : undefined;
}

// The orb runs for as long as the canvas is on the page, reading the props each frame without drawing the page again.
function useOrbLoop(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  props: VoiceOrbProps,
): void {
  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const loop = loopOn(canvas.current, () => latest.current);
    loop?.start();

    return (): void => loop?.stop();
  }, [canvas]);
}

const pixels = voiceOrbSize * window.devicePixelRatio;

function OrbCanvas(props: VoiceOrbProps): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  useOrbLoop(canvas, props);

  return (
    <canvas
      ref={canvas}
      width={pixels}
      height={pixels}
      style={{ width: voiceOrbSize, height: voiceOrbSize }}
    />
  );
}

/*
 * ElevenLabs' orb (MIT, from ElevenLabs UI) drawn on a canvas. It is the web and desktop drawing of the Argo orb: the
 * Voice call's screen draws `VoiceOrb`, and a phone's own drawing replaces this file without the screen changing.
 */
export function VoiceOrb(props: VoiceOrbProps): React.JSX.Element {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Voice ${props.state}`}
      className="overflow-hidden rounded-full bg-tone-info-200"
      style={{ width: voiceOrbSize, height: voiceOrbSize }}
    >
      <OrbCanvas {...props} />
    </View>
  );
}
