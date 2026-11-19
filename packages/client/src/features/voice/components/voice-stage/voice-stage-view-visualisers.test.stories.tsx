import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { FakeVoiceConnection } from '../../../../../mocks/voice/fake-voice-connection';
import type { VoiceLevels, VoiceSpectrum } from '../../voice-connection';
import { VoiceStageView } from './voice-stage-view';
import { listeningStage, talkingStage } from './voice-stage-view-fixtures';
import presentation from './voice-stage-view-visualisers.stories';

// Audio is replaced by a fake: the visualisers read their levels and bands from a connection that carries none.
const audio = new FakeVoiceConnection();

const meta = {
  title: 'Tests/Voice/VoiceStageViewVisualisers',
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

const kinds = ['orb', 'matrix', 'wave', 'band'] as const;

// Exactly one visualiser draws, and it is this one.
async function expectShowing(canvas: Canvas, kind: string): Promise<void> {
  await expect(canvas.getByTestId(`voice-visualiser-${kind}`)).toBeVisible();

  for (const other of kinds.filter((each) => each !== kind))
    await expect(
      canvas.queryByTestId(`voice-visualiser-${other}`),
    ).not.toBeInTheDocument();
}

// Where the well and the label sit, so a switch that moved either would show.
function placesOf(canvas: Canvas): string {
  const well = canvas.getByTestId('voice-visualiser').getBoundingClientRect();
  const label = canvas.getByText('Listening').getBoundingClientRect();

  return JSON.stringify([well.x, well.y, well.width, well.height, label.y]);
}

export const SwitchesTheVisualiser: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expectShowing(canvas, 'orb');
    await userEvent.click(canvas.getByRole('button', { name: 'Matrix' }));
    await expectShowing(canvas, 'matrix');
    await expect(args.visualiser?.onChange).toHaveBeenCalledWith('matrix');
    await expect(
      canvas.getByRole('button', { name: 'Matrix' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Wave' }));
    await expectShowing(canvas, 'wave');
    await expect(args.visualiser?.onChange).toHaveBeenLastCalledWith('wave');
    await userEvent.click(canvas.getByRole('button', { name: 'Orb' }));
    await expectShowing(canvas, 'orb');
  },
};

// Each visualiser takes the orb's footprint, so switching never moves the label or the Feed under the stage.
export const KeepsTheFootprint: Story = {
  play: async ({ canvas, userEvent }) => {
    const orb = placesOf(canvas);

    for (const name of ['Matrix', 'Wave', 'Orb']) {
      await userEvent.click(canvas.getByRole('button', { name }));
      await waitFor(() => expect(placesOf(canvas)).toBe(orb));
    }
  },
};

// The state label stays under every visualiser, and each names the call's state to assistive tech as the orb does.
export const KeepsTheStateLabel: Story = {
  args: { ...talkingStage, visualiser: { kind: 'matrix', onChange: fn() } },
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('img', { name: 'Voice talking' }),
    ).toBeVisible();
    await expect(canvas.getByText('Talking')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Wave' }));
    await expect(
      canvas.getByRole('img', { name: 'Voice talking' }),
    ).toBeVisible();
    await expect(canvas.getByText('Talking')).toBeVisible();
    await expect(canvas.getByText(/^Voice · /)).toBeVisible();
  },
};

// Where the App carries no call audio there is no toggle, and the orb draws.
export const OrbWithoutToggle: Story = {
  args: { visualiser: undefined },
  render: (args): React.JSX.Element => <VoiceStageView {...args} />,
  play: async ({ canvas }) => {
    await expectShowing(canvas, 'orb');
    await expect(
      canvas.queryByRole('group', { name: 'Visualiser' }),
    ).not.toBeInTheDocument();
  },
};

// The band draws along the Composer instead: the stage keeps only its toggle, so the Feed gets back its height.
export const BandLeavesOnlyTheToggle: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const tall = canvas
      .getByTestId('voice-stage')
      .getBoundingClientRect().height;

    await userEvent.click(canvas.getByRole('button', { name: 'Band' }));
    await expect(args.visualiser?.onChange).toHaveBeenCalledWith('band');
    await expect(
      canvas.queryByTestId('voice-visualiser'),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText('Listening')).not.toBeInTheDocument();
    await expect(
      canvas.getByTestId('voice-stage').getBoundingClientRect().height,
    ).toBeLessThan(tall / 2);
    await userEvent.click(canvas.getByRole('button', { name: 'Orb' }));
    await expectShowing(canvas, 'orb');
  },
};
