import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Platform, View } from 'react-native';
import { Variation, Variations } from '../../../variations';
import { Metadata } from './metadata';
import { fields } from './metadata.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Metadata',
  component: Metadata,
  args: { rows: fields },
} satisfies Meta<typeof Metadata>;
export default meta;

export const Overview: StoryObj<typeof meta> = {
  name: 'Metadata',
  render: (args) => (
    <Variations>
      <Variation label="Read-only fields">
        <View style={{ width: Platform.OS === 'web' ? 280 : 360 }}>
          <Metadata {...args} />
        </View>
      </Variation>
      <Variation label="Long path">
        <View style={{ width: Platform.OS === 'web' ? 280 : 360 }}>
          <Metadata
            rows={[
              {
                title: 'Path',
                value: {
                  kind: 'text',
                  text: '~/Developer/argo-universal/packages/client/src/lib/generic/primitives/scaffolds/metadata',
                },
              },
            ]}
          />
        </View>
      </Variation>
    </Variations>
  ),
};
