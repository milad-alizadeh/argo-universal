import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { FakeVoiceConnection } from '../../../../../mocks/voice/fake-voice-connection';
import type { VoiceLevels, VoiceSpectrum } from '../../voice-connection';
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

const segments = ['Orb', 'Matrix', 'Wave', 'Band'] as const;

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

// The chosen segment says so to assistive tech.
export const ChosenSegmentIsPressed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Orb' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};
