import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { SessionColumn } from '#lib/product/session-column';
import { sharedControls } from './composer-pill-comparison-fixtures';
import { ComposerPillComparison } from './composer-pill-comparison.mocks';

const meta = {
  title: 'Composer/ComposerPillComparison',
  component: ComposerPillComparison,
  decorators: [
    (Story): ReactElement => (
      <SessionColumn>
        <Story />
      </SessionColumn>
    ),
  ],
  parameters: { previewPadding: false },
  argTypes: {
    configuration: { control: false },
    status: { control: false },
    entries: { control: false },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ComposerPillComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SharedControls: Story = { args: sharedControls };
