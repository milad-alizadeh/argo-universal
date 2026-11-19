import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { VoiceLevels } from '../../voice-connection';
import { type OrbColors, useOrbColors } from './orb-colors';
import { orbOn, type OrbGl } from './orb-gl';
import { OrbMotion } from './orb-motion';
import {
  orbDisc,
  orbName,
  voiceOrbSize,
  type VoiceOrbProps,
} from './voice-orb-props';

const quiet: VoiceLevels = { input: 0, output: 0 };

// The props as the canvas draws them: the colours already chosen, given or the theme's.
type OrbCanvasProps = VoiceOrbProps & { colors: OrbColors };

const millisecondsPerSecond = 1000;

// Draws a frame at a time until stopped; each frame reads the state and the levels as they are then.
class OrbLoop {
  private readonly motion = new OrbMotion();
  private last = performance.now();
  private frame = 0;

  public constructor(
    private readonly drawing: OrbGl,
    private readonly read: () => OrbCanvasProps,
  ) {}

  public start(): void {
    this.frame = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    cancelAnimationFrame(this.frame);
    this.drawing.dispose();
  }

  private readonly tick = (now: number): void => {
    const { state, levels, colors } = this.read();
    const seconds = (now - this.last) / millisecondsPerSecond;
    const drawn = this.motion.step(state, levels?.() ?? quiet, seconds);
    this.drawing.draw(drawn, colors);
    this.last = now;
    this.start();
  };
}

// A loop on the canvas, or none where the window has no WebGL2.
function loopOn(
  canvas: HTMLCanvasElement | null,
  read: () => OrbCanvasProps,
): OrbLoop | undefined {
  const drawing = canvas && orbOn(canvas);

  return drawing ? new OrbLoop(drawing, read) : undefined;
}

// The orb runs for as long as the canvas is on the page, reading the props each frame without drawing the page again.
function useOrbLoop(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  props: OrbCanvasProps,
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

function OrbCanvas(props: OrbCanvasProps): React.JSX.Element {
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
  const colors = useOrbColors(props.colors);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={orbName(props.state)}
      className="overflow-hidden rounded-full"
      style={orbDisc(colors[0])}
    >
      <OrbCanvas {...props} colors={colors} />
    </View>
  );
}
