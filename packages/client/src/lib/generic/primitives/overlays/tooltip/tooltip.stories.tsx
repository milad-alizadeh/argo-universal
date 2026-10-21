import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { logoSources } from '#lib/generic/symbols/logo-source';
import { IconButton } from '#primitives/actions/icon-button';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Tooltip } from './tooltip';

const label = 'Link';

const meta = {
  title: 'Design System/Primitives/Overlays/Tooltip',
  component: Tooltip,
  argTypes: kitArgTypes('Tooltip'),
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

type Story = StoryObj;

export const Variations: Story = {};
