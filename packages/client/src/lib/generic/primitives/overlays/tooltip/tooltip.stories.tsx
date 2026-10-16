import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { IconButton } from '#primitives/buttons/icon-button';
import { Tooltip } from './tooltip';

const label = 'Visit Agent Repository';

const meta = {
  title: 'Design System/Primitives/Tooltip',
  render: (): ReactElement => (
    <Tooltip label={label}>
      <IconButton
        icon="repository"
        accessibilityLabel={label}
        variant="ghost"
      />
    </Tooltip>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {};
