import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from './text';

const meta = {
  title: 'Design System/Primitives/Content/Text',
  component: Text,
  args: { children: 'The quick brown fox jumps over the lazy dog.' },
  argTypes: kitArgTypes('Text'),
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Title: Story = { args: { role: 'title' } };

export const Heading: Story = { args: { role: 'heading' } };

export const Body: Story = { args: { role: 'body' } };

export const Secondary: Story = { args: { role: 'secondary' } };

export const SecondaryCode: Story = { args: { role: 'secondary-code' } };

export const Control: Story = { args: { role: 'control' } };

export const Badge: Story = { args: { role: 'badge' } };

export const Code: Story = { args: { role: 'code' } };

export const NavTitle: Story = { args: { role: 'nav-title' } };

export const NavAction: Story = { args: { role: 'nav-action' } };

export const Row: Story = { args: { role: 'row' } };

export const RowDetail: Story = { args: { role: 'row-detail' } };
