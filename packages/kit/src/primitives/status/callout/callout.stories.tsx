import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Callout } from './callout';
import { CalloutButton } from './callout-button';

const stderr = `Error: could not complete
  at step one
  at step two`;

// A wide window draws the callout in place; a phone presents the same content as a sheet.
const meta = {
  title: 'Design System/Primitives/Status/Callout',
  component: Callout,
  argTypes: kitArgTypes('Callout'),
  args: { title: 'Nothing added yet' },
} satisfies Meta<typeof Callout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    description: 'Press Add to get started.',
    actions: <CalloutButton label="Add" />,
  },
};

// The one tone Callout branches on: danger, for work that failed.
export const Failed: Story = {
  args: {
    tone: 'danger',
    title: 'Something failed',
    description: 'Exited with status 1',
    detail: stderr,
    actions: <CalloutButton label="Retry" />,
  },
};

export const Busy: Story = {
  args: {
    busy: true,
    title: 'Working…',
    actions: <CalloutButton variant="secondary" label="Cancel" />,
  },
};
