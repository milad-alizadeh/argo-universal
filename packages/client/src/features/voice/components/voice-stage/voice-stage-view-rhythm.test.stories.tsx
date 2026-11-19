import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { FakeVoiceConnection } from '../../../../../mocks/voice/fake-voice-connection';
import type { VoiceLevels, VoiceSpectrum } from '../../types/voice-connection';
import { VoiceStageView } from './voice-stage-view';
import { listeningStage } from './voice-stage-view-fixtures';
import presentation from './voice-stage-view-visualisers.stories';

// Audio is replaced by a fake: the stage's spacing does not depend on what it draws.
const audio = new FakeVoiceConnection();

const meta = {
  title: 'Tests/Voice/VoiceStageView/Rhythm',
  component: VoiceStageView,
  args: {
    ...listeningStage,
    levels: (): VoiceLevels => audio.levels(),
    spectrum: (): VoiceSpectrum => audio.spectrum(),
    visualiser: { kind: 'orb', onChange: fn() },
  },
  render: presentation.render,
} satisfies Meta<typeof VoiceStageView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const boxOf = (element: HTMLElement): DOMRect =>
  element.getBoundingClientRect();

const toggleOf = (canvas: Canvas): DOMRect =>
  boxOf(canvas.getByRole('group', { name: 'Visualiser' }));

const stageOf = (canvas: Canvas): DOMRect =>
  boxOf(canvas.getByTestId('voice-stage'));

const segments = ['Orb', 'Matrix', 'Wave', 'Band'] as const;

// The headline is the kit's Heading: semibold, 13 on a 20-point line on a wide window.
export const HeadlineIsHeading: Story = {
  play: async ({ canvas }) => {
    const style = getComputedStyle(canvas.getByText('Listening'));

    await expect([style.fontSize, style.lineHeight, style.fontWeight]).toEqual([
      '13px',
      '20px',
      '600',
    ]);
  },
};

/*
 * The stage keeps the 4-point grid: the toggle 12 under the stage's top, 16 to the drawing, 16 to the headline, 4 to the
 * detail, and 24 of room before the Feed.
 */
export const KeepsTheRhythm: Story = {
  play: async ({ canvas }) => {
    const stage = stageOf(canvas);
    const toggle = toggleOf(canvas);
    const well = boxOf(canvas.getByTestId('voice-visualiser'));
    const headline = boxOf(canvas.getByText('Listening'));
    const detail = boxOf(canvas.getByText(/^Voice · /));

    await expect([
      toggle.top - stage.top,
      well.top - toggle.bottom,
      headline.top - well.bottom,
      detail.top - headline.bottom,
      stage.bottom - detail.bottom,
    ]).toEqual([12, 16, 16, 4, 24]);
  },
};

// The toggle stays under the pointer whichever drawing it picks, Band included.
export const ToggleStaysPut: Story = {
  play: async ({ canvas, userEvent }) => {
    const first = toggleOf(canvas).top;

    for (const name of [...segments].reverse()) {
      await userEvent.click(canvas.getByRole('button', { name }));
      await waitFor(() => expect(toggleOf(canvas).top).toBe(first));
    }
  },
};

// Collapsed for the band, the stage pads the toggle evenly above and below.
export const BandStageIsEven: Story = {
  args: { visualiser: { kind: 'band', onChange: fn() } },
  play: async ({ canvas }) => {
    const stage = stageOf(canvas);
    const toggle = toggleOf(canvas);

    await expect(toggle.top - stage.top).toBe(stage.bottom - toggle.bottom);
  },
};

// Each segment is as wide as the others, and the chosen one says so to assistive tech.
export const EqualSegments: Story = {
  play: async ({ canvas }) => {
    const widths = segments.map(
      (name) => boxOf(canvas.getByRole('button', { name })).width,
    );

    await expect(new Set(widths).size).toBe(1);
    await expect(canvas.getByRole('button', { name: 'Orb' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};
