import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Pill } from './pill';
import {
  accentPill,
  dangerPill,
  donePill,
  infoPill,
  mutedPill,
  neutralPill,
  successPill,
  warningPill,
} from './pill-fixtures';

const meta = {
  title: 'Design System/Primitives/Status/Pill',
  component: Pill,
  args: neutralPill,
  argTypes: kitArgTypes('Pill'),
} satisfies Meta<typeof Pill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: neutralPill };

export const Muted: Story = { args: mutedPill };

export const Accent: Story = { args: accentPill };

export const Info: Story = { args: infoPill };

export const Success: Story = { args: successPill };

export const Warning: Story = { args: warningPill };

export const Danger: Story = { args: dangerPill };

export const Done: Story = { args: donePill };
