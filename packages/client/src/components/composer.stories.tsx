import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Platform, ScrollView, View } from 'react-native';
import { action } from 'storybook/actions';
import {
  ComposerMock,
  composerImages,
  composerPlanDone,
  oversizedComposerImage,
} from '../../mocks/composer-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { imageSelectionFailureMessage } from '../lib/use-image-draft';
import { Composer } from './composer';

const meta = {
  title: 'Sessions/Composer',
  component: Composer,
  parameters: {
    previewPadding: false,
    screenPreview: Platform.OS !== 'web',
  },
  args: {
    draft: { text: '', images: [] },
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onAttachFiles: action('attach files'),
    onSelectSlashCommand: action('slash commands'),
    onCreateGoal: action('create goal'),
    onSend: action('send prompt'),
  },
} satisfies Meta<typeof Composer>;
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
        <ComposerMock {...args} />
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
              <ComposerMock {...args} />
            </Variation>
            <Variation label="Typing">
              <ComposerMock
                {...args}
                draft={{ text: 'Match the spacing and colours.', images: [] }}
              />
            </Variation>
            <Variation label="Multi-line">
              <ComposerMock
                {...args}
                draft={{
                  text: 'Match the spacing and colours.\nKeep the phone layout readable.\nUse the shared light and dark themes.',
                  images: [],
                }}
              />
            </Variation>
            <Variation label="Scrollable draft">
              <ComposerMock
                {...args}
                draft={{
                  text: 'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line',
                  images: [],
                }}
              />
            </Variation>
            <Variation label="Images attached">
              <ComposerMock
                {...args}
                draft={{
                  text: 'Match these screenshots.',
                  images: composerImages,
                }}
              />
            </Variation>
            <Variation label="Image too large">
              <ComposerMock
                {...args}
                draft={{
                  text: 'Match these screenshots.',
                  images: [oversizedComposerImage],
                }}
              />
            </Variation>
            <Variation label="Sending">
              <ComposerMock
                {...args}
                draft={{ text: 'Match the spacing and colours.', images: [] }}
                sending
              />
            </Variation>
            <Variation label="Disabled">
              <ComposerMock
                {...args}
                draft={{ text: 'Match the spacing and colours.', images: [] }}
                disabled
              />
            </Variation>
            <Variation label="Turn running">
              <ComposerMock
                {...args}
                sessionStarted
                running
                onStop={action('stop Turn')}
              />
            </Variation>
            <Variation label="In a Session">
              <ComposerMock {...args} sessionStarted />
            </Variation>
            <Variation label="Plan done">
              <ComposerMock {...args} sessionStarted plan={composerPlanDone} />
            </Variation>
            <Variation label="No Plan">
              <ComposerMock {...args} sessionStarted plan={[]} />
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
