import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { Uniwind } from 'uniwind';
import { VoiceOrb } from './voice-orb';

// Tailwind's neutral shades as sRGB channels from 0 to 1, read from the palette rather than from the code under test.
const neutral300 = 212 / 255;

const neutral400 = 161 / 255;

const neutral600 = 82 / 255;

const neutral700 = 64 / 255;

const meta = {
  title: 'Tests/Voice/VoiceOrb',
  component: VoiceOrb,
  args: { state: 'listening' },
} satisfies Meta<typeof VoiceOrb>;

export default meta;

type Story = StoryObj<typeof meta>;

type Root = Parameters<NonNullable<Story['play']>>[0]['canvasElement'];

interface Drawing {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
}

function contextIn(root: Root): WebGL2RenderingContext {
  const gl = root.querySelector('canvas')?.getContext('webgl2');

  if (!gl) throw new Error('The orb has no WebGL2 canvas');

  return gl;
}

// The orb's WebGL2 context and the program it draws with.
function drawingIn(root: Root): Drawing {
  const gl = contextIn(root);
  const program: unknown = gl.getParameter(gl.CURRENT_PROGRAM);

  if (!(program instanceof WebGLProgram))
    throw new Error('The orb has no WebGL2 program');

  return { gl, program };
}

function uniform({ gl, program }: Drawing, name: string): number[] {
  const location = gl.getUniformLocation(program, name);
  const value: unknown = location && gl.getUniform(program, location);

  return value instanceof Float32Array ? [...value] : [];
}

// The two colours the orb's shader draws with right now: ElevenLabs' `uColor1` and `uColor2`.
function drawnPair(root: Root): number[][] {
  const drawing = drawingIn(root);

  return [uniform(drawing, 'uColor1'), uniform(drawing, 'uColor2')];
}

// A grey as three equal channels, to within one step of eight bits.
const grey = (level: number): unknown[] =>
  [0, 1, 2].map(() => expect.closeTo(level, 2));

async function expectPair(
  root: Root,
  first: number,
  second: number,
): Promise<void> {
  await waitFor(() =>
    expect(drawnPair(root)).toEqual([grey(first), grey(second)]),
  );
}

// With no `colors`, the orb draws the Accent tone's 300 and 400 shades from the theme, and a theme change repaints it.
export const ThemeColors: Story = {
  play: async ({ canvasElement }) => {
    await expectPair(canvasElement, neutral300, neutral400);

    try {
      Uniwind.setTheme('dark');
      await expectPair(canvasElement, neutral700, neutral600);
    } finally {
      Uniwind.setTheme('light');
    }

    await expectPair(canvasElement, neutral300, neutral400);
  },
};
