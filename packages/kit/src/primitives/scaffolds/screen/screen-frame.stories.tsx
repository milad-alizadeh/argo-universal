import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Screen } from './index';
import {
  AsideColumnExample,
  AsideExample,
  BleedExample,
  FooterExample,
} from './screen-frame.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Screen/Frame',
  component: Screen,
  argTypes: kitArgTypes('Screen'),
  args: { title: 'Title' },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * Where the aside draws as the page narrows: at tablet and phone width it leads the body, the same FieldGroup rows as
 * its own column holds. The aside's own column needs a wide Screen at least 976 wide (screen-aside-place.ts).
 */
export const AsidePlaces: Story = {
  render: (): React.JSX.Element => (
    <View className="flex-row items-start gap-4">
      <AsideExample width={375} />
      <AsideExample width={768} />
    </View>
  ),
};

// A window wide enough for the aside's own column at the trailing edge, beside the reading column.
export const AsideColumn: Story = {
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => <AsideColumnExample />,
};

export const Bleed: Story = {
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => <BleedExample />,
};

export const Footer: Story = {
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => <FooterExample />,
};
