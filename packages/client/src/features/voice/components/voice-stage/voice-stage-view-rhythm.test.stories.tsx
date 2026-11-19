import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { FakeVoiceConnection } from '../../../../../mocks/voice/fake-voice-connection';
import type { VoiceLevels } from '../../types/voice-connection';
import { VoiceStageView } from './voice-stage-view';
import { listeningStage } from './voice-stage-view-fixtures';

// Audio is replaced by a fake: the stage's spacing does not depend on what it draws.
const audio = new FakeVoiceConnection();

const meta = {
  title: 'Tests/Voice/VoiceStageView/Rhythm',
  component: VoiceStageView,
  args: {
    ...listeningStage,
    levels: (): VoiceLevels => audio.levels(),
  },
} satisfies Meta<typeof VoiceStageView>;

export default meta;

type Story = StoryObj<typeof meta>;

const boxOf = (element: HTMLElement): DOMRect =>
  element.getBoundingClientRect();

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
 * The stage keeps the 4-point grid and Paper's 36 above the orb: 16 to the headline, 4 to the detail, and 24 of room
 * before the Feed.
 */
export const KeepsTheRhythm: Story = {
  play: async ({ canvas }) => {
    const stage = boxOf(canvas.getByTestId('voice-stage'));
    const well = boxOf(canvas.getByTestId('voice-visualiser'));
    const headline = boxOf(canvas.getByText('Listening'));
    const detail = boxOf(canvas.getByText(/^Voice · /));

    await expect([
      well.top - stage.top,
      headline.top - well.bottom,
      detail.top - headline.bottom,
      stage.bottom - detail.bottom,
    ]).toEqual([36, 16, 4, 24]);
  },
};

// A call draws no visualiser toggle: the choice is made in Settings › Voice.
export const OffersNoVisualiserToggle: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('group', { name: 'Visualiser' }),
    ).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Band' })).toBeNull();
  },
};
