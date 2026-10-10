import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { Text } from '#lib/generic/primitives/text';
import {
  SectionRootView,
  type SectionRootViewProps,
} from './section-root-view';

const meta = {
  title: 'Tests/SectionRootView',
  component: SectionRootView,
  args: {
    phone: <Text>Phone list</Text>,
    page: <Text>First page</Text>,
  },
  render: (args): React.JSX.Element => (
    <View className="h-[400px] w-full">
      <SectionRootView {...args} />
    </View>
  ),
} satisfies Meta<SectionRootViewProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WideShowsTheFirstPage: Story = {
  play: async ({ canvas }) => {
    await page.viewport(1440, 844);
    await expect(await canvas.findByText('First page')).toBeVisible();
    await expect(canvas.queryByText('Phone list')).toBeNull();
  },
};

export const PhoneShowsTheList: Story = {
  play: async ({ canvas }) => {
    await page.viewport(390, 844);
    await expect(await canvas.findByText('Phone list')).toBeVisible();
    await expect(canvas.queryByText('First page')).toBeNull();
  },
};
