import { newSessionCatalogs } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { action } from 'storybook/actions';
import {
  ComposerMock,
  composerImages,
  composerPlanDone,
  oversizedComposerImage,
} from '../../mocks/composer-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { imageSelectionFailureMessage } from './use-image-draft';

function ComposerPreview(
  args: React.ComponentProps<typeof ComposerMock>,
): React.JSX.Element {
  return <ComposerMock key={args.initialAgent} {...args} />;
}

const [firstAgent] = newSessionCatalogs.bothAvailable;
if (!firstAgent) throw new Error('Recorded catalog needs an available Agent.');

const meta = {
  title: 'Sessions/Composer',
  component: ComposerPreview,
  parameters: {
    previewPadding: false,
    screenPreview: Platform.OS !== 'web',
  },
  args: {
    initialAgent: firstAgent.agent,
    draft: { text: '', images: [] },
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onAttachFiles: action('attach files'),
    onSelectSlashCommand: action('slash commands'),
    onCreateGoal: action('create goal'),
    onSend: action('send prompt'),
  },
  argTypes: {
    initialAgent: {
      name: 'Agent',
      options: newSessionCatalogs.bothAvailable.map((agent) => agent.agent),
      control: {
        type: 'select',
        labels: Object.fromEntries(
          newSessionCatalogs.bothAvailable.map((agent) => [
            agent.agent,
            agent.label,
          ]),
        ),
      },
    },
  },
} satisfies Meta<typeof ComposerPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ImageSelectionFailed: Story = {
  args: {
    draft: { text: 'Build this screen using the brief.', images: [] },
    error: imageSelectionFailureMessage,
  },
  render: (args) => (
    <View className="w-full items-center p-4">
      <View className="w-full max-w-composer">
        <ComposerPreview {...args} />
      </View>
    </View>
  ),
};

export const Overview: Story = {
  name: 'Composer',
  render: (args) => {
    const overview = (
      <View className="w-full items-center p-4">
        <View className="w-full max-w-composer">
          <Variations className="max-w-none">
            <Variation label="Empty">
              <ComposerPreview {...args} />
            </Variation>
            <Variation label="Typing">
              <ComposerPreview
                {...args}
                draft={{ text: spacingAndColoursPrompt, images: [] }}
              />
            </Variation>
            <Variation label="Multi-line">
              <ComposerPreview
                {...args}
                draft={{
                  text: 'Match the spacing and colours.\nKeep the phone layout readable.\nUse the shared light and dark themes.',
                  images: [],
                }}
              />
            </Variation>
            <Variation label="Scrollable draft">
              <ComposerPreview
                {...args}
                draft={{
                  text: 'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line',
                  images: [],
                }}
              />
            </Variation>
            <Variation label="Images attached">
              <ComposerPreview
                {...args}
                draft={{
                  text: 'Match these screenshots.',
                  images: composerImages,
                }}
              />
            </Variation>
            <Variation label="Image too large">
              <ComposerPreview
                {...args}
                draft={{
                  text: 'Match these screenshots.',
                  images: [oversizedComposerImage],
                }}
              />
            </Variation>
            <Variation label="Sending">
              <ComposerPreview
                {...args}
                draft={{ text: spacingAndColoursPrompt, images: [] }}
                sending
              />
            </Variation>
            <Variation label="Disabled">
              <ComposerPreview
                {...args}
                draft={{ text: spacingAndColoursPrompt, images: [] }}
                disabled
              />
            </Variation>
            <Variation label="Turn running">
              <ComposerPreview
                {...args}
                sessionStarted
                running
                onStop={action('stop Turn')}
              />
            </Variation>
            <Variation label="In a Session">
              <ComposerPreview {...args} sessionStarted />
            </Variation>
            <Variation label="Plan done">
              <ComposerPreview
                {...args}
                sessionStarted
                plan={composerPlanDone}
              />
            </Variation>
            <Variation label="No Plan">
              <ComposerPreview {...args} sessionStarted plan={[]} />
            </Variation>
          </Variations>
        </View>
      </View>
    );
    return Platform.OS === 'web' ? (
      overview
    ) : (
      <ScrollView style={{ flex: 1 }}>{overview}</ScrollView>
    );
  },
};
