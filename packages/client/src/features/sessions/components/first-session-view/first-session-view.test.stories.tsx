import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import {
  FirstSessionView,
  type FirstSessionViewProps,
} from './first-session-view';

const meta = {
  title: 'Tests/FirstSessionView',
  args: { view: { state: 'loading' } },
  render: ({ view }): React.JSX.Element => <FirstSessionView {...view} />,
} satisfies Meta<{ view: FirstSessionViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

// While the list loads the root stays blank, so neither page flashes.
export const PendingListStaysBlank: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.queryByRole('heading')).toBeNull();
    await expect(canvas.queryByRole('textbox')).toBeNull();
  },
};
