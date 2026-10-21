import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Callout } from './callout';
import { busyCallout, failedCallout, infoCallout } from './callout-fixtures';

// A wide window draws the callout in place; a phone presents the same content as a sheet.
const meta = {
  title: 'Design System/Primitives/Status/Callout',
  component: Callout,
  argTypes: kitArgTypes('Callout'),
} satisfies Meta<typeof Callout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = { args: infoCallout };

// The one tone Callout branches on: danger, for work that failed.
export const Failed: Story = { args: failedCallout };

export const Busy: Story = { args: busyCallout };
