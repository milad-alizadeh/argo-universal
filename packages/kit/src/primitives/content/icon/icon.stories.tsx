import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FilledSymbols } from './filled-symbols.mocks';
import { Icon } from './icon';
import {
  ColorsExample,
  CornerStatusExample,
  EveryIconExample,
  IconButtonsExample,
  LogoExample,
  SizesExample,
} from './icon-examples.mocks';
import { SfAndMaterialTable } from './sf-symbol-table.mocks';

const meta = {
  title: 'Design System/Primitives/Content/Icon',
  component: Icon,
  argTypes: kitArgTypes('Icon'),
  args: { name: 'add', size: 'sm' },
  tags: ['third-party'],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EveryIcon: Story = { render: EveryIconExample };

export const InsideIconButtons: Story = { render: IconButtonsExample };

export const Roles: Story = {
  render: SizesExample,
  parameters: {
    docs: {
      description: {
        story: 'Each role steps to its phone size below the wide breakpoint.',
      },
    },
  },
};

export const Filled: Story = {
  render: FilledSymbols,
  parameters: {
    docs: {
      description: { story: 'Fill follows selection on every platform.' },
    },
  },
};

export const Colors: Story = {
  render: ColorsExample,
  parameters: {
    docs: {
      description: {
        story: 'Foreground, muted, primary and destructive.',
      },
    },
  },
};

export const Logo: Story = {
  render: LogoExample,
  parameters: {
    docs: {
      description: { story: 'GitHub’s mark beside the web symbol.' },
    },
  },
};

export const CornerStatus: Story = { render: CornerStatusExample };

// SF is drawn by this Mac through Storybook's dev server, so the SF column is empty off macOS.
export const SfAndMaterial: Story = {
  name: 'SF and Material',
  render: SfAndMaterialTable,
};
