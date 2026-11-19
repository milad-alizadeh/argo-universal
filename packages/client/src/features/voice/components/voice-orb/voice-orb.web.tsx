import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { VoiceLevels } from '../../voice-connection';
import { type OrbGl, orbOn, type OrbStarting } from './orb-gl';
import { OrbMotion } from './orb-motion';
import { orbName, voiceOrbSize, type VoiceOrbProps } from './voice-orb-props';

const quiet: VoiceLevels = { input: 0, output: 0 };

const millisecondsPerSecond = 1000;

// Draws a frame at a time until stopped; each frame reads the state and the levels as they are then.
class OrbLoop {
  private readonly motion = new OrbMotion();
  private last = performance.now();
  private frame = 0;
  private drawing: OrbGl | undefined;
  private starting: OrbStarting | null | undefined;
  private painted = false;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly read: () => VoiceOrbProps,
  ) {}

  public start(): void {
    this.frame = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    cancelAnimationFrame(this.frame);
    this.drawing?.dispose();
  }

  /*
   * The first frame paints the well and the page around it; the drawing starts on the next, and draws once its shaders
   * are ready, so neither the context nor the compile holds the frame the call appears on.
   */
  private readonly tick = (now: number): void => {
    this.drawing ??= this.ready();
    this.drawOrWait(now);

    if (this.starting !== null) this.start();
  };

  private ready(): OrbGl | undefined {
    if (this.starting === undefined) this.begin();
    else return this.starting?.ready();

    return undefined;
  }

  // Waits out the frame the orb appears on, then starts the drawing.
  private begin(): void {
    if (this.painted) this.starting = orbOn(this.canvas);
    else this.painted = true;
  }

  // Until it draws, the orb's clock waits, so its motion and fade start with its first drawn frame.
  private drawOrWait(now: number): void {
    if (this.drawing) this.draw(this.drawing, now);
    else this.last = now;
  }

  private draw(drawing: OrbGl, now: number): void {
    const { state, levels } = this.read();
    const seconds = (now - this.last) / millisecondsPerSecond;
    drawing.draw(this.motion.step(state, levels?.() ?? quiet, seconds));
    this.last = now;
  }
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
    const loop =
      canvas.current && new OrbLoop(canvas.current, () => latest.current);

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
      accessibilityLabel={orbName(props.state)}
      className="overflow-hidden rounded-full bg-tone-info-200"
      style={{ width: voiceOrbSize, height: voiceOrbSize }}
    >
      <OrbCanvas {...props} />
    </View>
  );
}
