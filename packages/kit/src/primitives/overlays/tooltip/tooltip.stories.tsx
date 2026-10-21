import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { logoSources } from '#kit/symbols/logo-source';
import { IconButton } from '#primitives/actions/icon-button';
import { Tooltip } from './tooltip';

const label = 'Link';

const meta = {
  title: 'Design System/Primitives/Overlays/Tooltip',
  component: Tooltip,
  // The trigger is composed in the render, so `children` is an arg in name only.
  args: { label, children: undefined },
  argTypes: kitArgTypes('Tooltip'),
  // A tooltip wraps the caller's own control, which the story composes rather than passes as an arg.
  render: (args): ReactElement => (
    <Tooltip {...args}>
      <IconButton
        iconSource={logoSources.github}
        accessibilityLabel={args.label}
        variant="ghost"
      />
    </Tooltip>
  ),
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
