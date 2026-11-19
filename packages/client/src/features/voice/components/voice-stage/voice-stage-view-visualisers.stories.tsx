import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { syntheticVoiceAudio } from '../../../../../mocks/voice/synthetic-voice-audio';
import type { VoiceVisualiserKind } from '../voice-visualiser/voice-visualiser-kind';
import { VoiceStageView, type VoiceStageViewProps } from './voice-stage-view';
import {
  connectingStage,
  listeningStage,
  reconnectingStage,
  talkingStage,
  thinkingStage,
} from './voice-stage-view-fixtures';

// Sound with no microphone and no voice: the visualisers move as they would on a call.
const audio = syntheticVoiceAudio();

// The stage holds the chosen visualiser, so pressing the toggle switches it as the App's stored choice does.
function Switching(props: VoiceStageViewProps): React.JSX.Element {
  const [kind, setKind] = useState(props.visualiser?.kind ?? 'orb');

  const onChange = (next: VoiceVisualiserKind): void => {
    setKind(next);
    props.visualiser?.onChange(next);
  };

  return <VoiceStageView {...props} visualiser={{ kind, onChange }} />;
}

const meta = {
  title: 'Voice/VoiceStageViewVisualisers',
  component: VoiceStageView,
  args: { ...audio, ...listeningStage },
  argTypes: {
    label: { control: false },
    levels: { control: false },
    spectrum: { control: false },
    visualiser: { control: false },
  },
  render: (args): React.JSX.Element => <Switching {...args} />,
} satisfies Meta<typeof VoiceStageView>;

export default meta;

type Story = StoryObj<typeof meta>;

const showing = (
  kind: VoiceVisualiserKind,
): VoiceStageViewProps['visualiser'] => ({
  kind,
  onChange: fn(),
});

export const OrbConnecting: Story = {
  args: { ...connectingStage, visualiser: showing('orb') },
};

export const OrbListening: Story = {
  args: { ...listeningStage, visualiser: showing('orb') },
};

export const OrbTalking: Story = {
  args: { ...talkingStage, visualiser: showing('orb') },
};

export const OrbThinking: Story = {
  args: { ...thinkingStage, visualiser: showing('orb') },
};

export const OrbReconnecting: Story = {
  args: { ...reconnectingStage, visualiser: showing('orb') },
};

export const MatrixConnecting: Story = {
  args: { ...connectingStage, visualiser: showing('matrix') },
};

export const MatrixListening: Story = {
  args: { ...listeningStage, visualiser: showing('matrix') },
};

export const MatrixTalking: Story = {
  args: { ...talkingStage, visualiser: showing('matrix') },
};

export const MatrixThinking: Story = {
  args: { ...thinkingStage, visualiser: showing('matrix') },
};

export const MatrixReconnecting: Story = {
  args: { ...reconnectingStage, visualiser: showing('matrix') },
};

export const WaveConnecting: Story = {
  args: { ...connectingStage, visualiser: showing('wave') },
};

export const WaveListening: Story = {
  args: { ...listeningStage, visualiser: showing('wave') },
};

export const WaveTalking: Story = {
  args: { ...talkingStage, visualiser: showing('wave') },
};

export const WaveThinking: Story = {
  args: { ...thinkingStage, visualiser: showing('wave') },
};

export const WaveReconnecting: Story = {
  args: { ...reconnectingStage, visualiser: showing('wave') },
};
