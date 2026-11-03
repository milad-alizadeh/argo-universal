import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { Screen } from './index';
import {
  AsideExample,
  BleedExample,
  FooterExample,
} from './screen-frame.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Screen/Frame',
  component: Screen,
  args: { title: 'Title' },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * Where the aside draws as the page narrows: Pills under the title at tablet width, and icon Pills at phone width, with
 * the status keeping its words. The aside's own column needs a window wider than 1440 (screen-aside-place.ts).
 */
export const AsidePlaces: Story = {
  render: (): React.JSX.Element => (
    <View className="flex-row items-start gap-4">
      <AsideExample width={375} />
      <AsideExample width={768} />
    </View>
  ),
};

export const Bleed: Story = {
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => <BleedExample />,
};

export const Footer: Story = {
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => <FooterExample />,
};
