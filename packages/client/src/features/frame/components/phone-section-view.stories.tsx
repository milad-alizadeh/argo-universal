import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { sectionDestination } from '../../../lib/product/navigation/sections';
import { LayoutListMock } from './layout-list.mocks';
import { PhoneLayoutView } from './phone-layout-view';
import {
  PhoneSectionView,
  type PhoneSectionViewProps,
} from './phone-section-view';

const meta = {
  title: 'Shell/PhoneSectionScreen',
  component: PhoneSectionView,
  parameters: { screenPreview: true },
  argTypes: {
    section: {
      control: 'select',
      options: ['sessions', 'issues', 'atlas', 'settings'],
    },
  },
  args: { section: 'settings', list: null },
  render: (args): React.JSX.Element => (
    <View className="h-[796px] w-full">
      <PhoneLayoutView
        destination={sectionDestination(args.section)}
        attentionCount={0}
      >
        <PhoneSectionView {...args} list={<LayoutListMock name="Section" />} />
      </PhoneLayoutView>
    </View>
  ),
} satisfies Meta<PhoneSectionViewProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'PhoneSectionScreen' };
