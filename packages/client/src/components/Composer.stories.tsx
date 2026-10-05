import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  ComposerMock,
  composerImages,
  oversizedComposerImage,
} from '../../mocks/composer-mock';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Composer } from './Composer';

const meta = {
  title: 'Sessions/Composer',
  component: Composer,
  parameters: { previewPadding: false },
  args: {
    draft: { text: '', images: [] },
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onSend: action('send prompt'),
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Composer',
  render: (args) => (
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
        </Variations>
      </View>
    </View>
  ),
};
