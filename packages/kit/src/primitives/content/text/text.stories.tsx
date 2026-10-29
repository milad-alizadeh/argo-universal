import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from './text';
import {
  titleText,
  headingText,
  bodyText,
  bodyCodeText,
  secondaryText,
  secondaryCodeText,
  controlText,
  badgeText,
  codeText,
  navTitleText,
  navActionText,
  rowText,
  rowDetailText,
} from './text-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/Text',
  component: Text,
  argTypes: kitArgTypes('Text'),
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Title: Story = { args: titleText };

export const Heading: Story = { args: headingText };

export const Body: Story = { args: bodyText };

export const BodyCode: Story = { args: bodyCodeText };

export const Secondary: Story = { args: secondaryText };

export const SecondaryCode: Story = { args: secondaryCodeText };

export const Control: Story = { args: controlText };

export const Badge: Story = { args: badgeText };

export const Code: Story = { args: codeText };

export const NavTitle: Story = { args: navTitleText };

export const NavAction: Story = { args: navActionText };

export const Row: Story = { args: rowText };

export const RowDetail: Story = { args: rowDetailText };
