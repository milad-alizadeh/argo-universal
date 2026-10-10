import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { sectionDestination } from '../../../lib/product/navigation/sections';
import { LayoutListMock } from './layout-list.mocks';
import {
  PhoneLayoutView,
  type PhoneLayoutViewProps,
} from './phone-layout-view';
import { PhoneSectionView } from './phone-section-view';

const meta = {
  title: 'Shell/PhoneLayoutView',
  component: PhoneLayoutView,
  parameters: { screenPreview: true },
  args: {
    destination: sectionDestination('sessions'),
    attentionCount: 1,
    children: null,
  },
  render: (args): React.JSX.Element => (
    <View className="h-[796px] w-full">
      <PhoneLayoutView {...args}>
        <PhoneSectionView
          section="sessions"
          list={<LayoutListMock name="Sessions" />}
        />
      </PhoneLayoutView>
    </View>
  ),
} satisfies Meta<PhoneLayoutViewProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'PhoneLayoutView' };
