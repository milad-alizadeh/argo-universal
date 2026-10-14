import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Icon } from './icon';
import { IconExamples } from './icon-examples.mocks';
import { SfAndMaterialTable } from './sf-symbol-table.mocks';

const meta = {
  title: 'Design System/Primitives/Icon',
  component: Icon,
  args: { name: 'add', role: 'control' },
  tags: ['third-party'],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Icon',
  render: IconExamples,
};

// SF is drawn by this Mac through Storybook's dev server, so the SF column is empty off macOS.
export const SfAndMaterial: Story = {
  name: 'SF and Material',
  render: SfAndMaterialTable,
};
