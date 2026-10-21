import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Label } from './label';
import {
  accentLabel,
  countLabel,
  dangerLabel,
  infoLabel,
  mergedLabel,
  neutralLabel,
  queuedLabel,
  successLabel,
  textOnlyLabel,
} from './label-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/Label',
  component: Label,
  argTypes: kitArgTypes('Label'),
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Count: Story = { args: countLabel };

export const Success: Story = { args: successLabel };

export const Info: Story = { args: infoLabel };

export const Danger: Story = { args: dangerLabel };

export const Merged: Story = { args: mergedLabel };

export const Queued: Story = { args: queuedLabel };

export const Neutral: Story = { args: neutralLabel };

export const Accent: Story = { args: accentLabel };

export const TextOnly: Story = { args: textOnlyLabel };
