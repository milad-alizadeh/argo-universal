import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { logoSources } from '#lib/generic/symbols/logo-source';
import { IconButton } from '#primitives/actions/icon-button';
import { Tooltip } from './tooltip';

const label = 'Repository';

const meta = {
  title: 'Design System/Primitives/Overlays/Tooltip',
  render: (): ReactElement => (
    <Tooltip label={label}>
      <IconButton
        iconSource={logoSources.github}
        accessibilityLabel={label}
        variant="ghost"
      />
    </Tooltip>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {};
