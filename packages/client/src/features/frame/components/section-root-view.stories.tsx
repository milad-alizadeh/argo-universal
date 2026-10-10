import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { LayoutListMock } from './layout-list.mocks';
import {
  SectionRootView,
  type SectionRootViewProps,
} from './section-root-view';

const meta = {
  title: 'screens/SectionRootScreen',
  component: SectionRootView,
  parameters: { screenPreview: true },
  args: { phone: null, page: null },
  render: (args): React.JSX.Element => (
    <View className="h-[796px] w-full">
      <SectionRootView
        {...args}
        phone={<LayoutListMock name="Settings" />}
        page={<Text>Accounts will appear here.</Text>}
      />
    </View>
  ),
} satisfies Meta<SectionRootViewProps>;
export default meta;

export const Section: StoryObj<typeof meta> = {};
