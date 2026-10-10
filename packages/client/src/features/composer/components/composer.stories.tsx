import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { action } from 'storybook/actions';
import {
  composerProps,
  type ComposerMockProps,
  composerImages,
  composerPlanDone,
  oversizedComposerImage,
} from '../../../../mocks/composer-mock';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { imageSelectionFailureMessage } from '../hooks/use-image-draft';
import { Composer } from './composer';

const spacingAndColoursPrompt = 'Match the spacing and colours.';

const [firstAgent] = newSessionCatalogs.bothAvailable;
if (!firstAgent) throw new Error('Recorded catalog needs an available Agent.');

const meta = {
  title: 'Sessions/Composer',
  component: Composer,
  render: (args): React.JSX.Element => <Composer {...composerProps(args)} />,
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
} satisfies Meta<ComposerMockProps>;
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
        <Composer {...composerProps({ ...args })} />
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
              <Composer {...composerProps({ ...args })} />
            </Variation>
            <Variation label="Typing">
              <Composer
                {...composerProps({
                  ...args,
                  draft: { text: spacingAndColoursPrompt, images: [] },
                })}
              />
            </Variation>
            <Variation label="Multi-line">
              <Composer
                {...composerProps({
                  ...args,
                  draft: {
                    text: 'Match the spacing and colours.\nKeep the phone layout readable.\nUse the shared light and dark themes.',
                    images: [],
                  },
                })}
              />
            </Variation>
            <Variation label="Scrollable draft">
              <Composer
                {...composerProps({
                  ...args,
                  draft: {
                    text: 'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line',
                    images: [],
                  },
                })}
              />
            </Variation>
            <Variation label="Images attached">
              <Composer
                {...composerProps({
                  ...args,
                  draft: {
                    text: 'Match these screenshots.',
                    images: composerImages,
                  },
                })}
              />
            </Variation>
            <Variation label="Image too large">
              <Composer
                {...composerProps({
                  ...args,
                  draft: {
                    text: 'Match these screenshots.',
                    images: [oversizedComposerImage],
                  },
                })}
              />
            </Variation>
            <Variation label="Sending">
              <Composer
                {...composerProps({
                  ...args,
                  draft: { text: spacingAndColoursPrompt, images: [] },
                  sending: true,
                })}
              />
            </Variation>
            <Variation label="Disabled">
              <Composer
                {...composerProps({
                  ...args,
                  draft: { text: spacingAndColoursPrompt, images: [] },
                  disabled: true,
                })}
              />
            </Variation>
            <Variation label="Turn running">
              <Composer
                {...composerProps({
                  ...args,
                  sessionStarted: true,
                  running: true,
                  onStop: action('stop Turn'),
                })}
              />
            </Variation>
            <Variation label="In a Session">
              <Composer {...composerProps({ ...args, sessionStarted: true })} />
            </Variation>
            <Variation label="Plan done">
              <Composer
                {...composerProps({
                  ...args,
                  sessionStarted: true,
                  plan: composerPlanDone,
                })}
              />
            </Variation>
            <Variation label="No Plan">
              <Composer
                {...composerProps({ ...args, sessionStarted: true, plan: [] })}
              />
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
