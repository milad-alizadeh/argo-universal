import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import {
  FirstSessionView,
  type FirstSessionViewProps,
} from './first-session-view';

const meta = {
  title: 'Tests/FirstSessionScreen',
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

export const ListLoadFailure: Story = {
  args: { view: { state: 'load-failed', onRetry: fn() } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      await canvas.findByText("Couldn't load Sessions"),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    if (args.view.state !== 'load-failed')
      throw new Error('The story needs a load failure.');
    await expect(args.view.onRetry).toHaveBeenCalledOnce();
  },
};
