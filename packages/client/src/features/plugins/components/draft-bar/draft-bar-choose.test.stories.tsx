import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  ChooseBarMock,
  type ChooseCall,
} from '../../hooks/draft-bar-choose.mocks';

const chooseCalls = (calls: ChooseCall[]): ChooseCall[] =>
  calls.filter(({ path }) => path === 'plugin.draft.choose');

const meta = {
  title: 'Tests/Plugins/DraftBar/Choose',
  component: ChooseBarMock,
  args: { withRegions: true, calls: [] },
} satisfies Meta<typeof ChooseBarMock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChooseSendsOneVariantPerRegion: Story = {
  args: { calls: [] },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Choose' }),
    );

    await waitFor(() => expect(chooseCalls(args.calls)).toHaveLength(1));
    await expect(chooseCalls(args.calls)[0]?.input).toEqual({
      pluginId: 'tracker',
      picks: [
        { region: 'header', variant: 'compact' },
        { region: 'list', variant: 'rows' },
      ],
      comments: [],
    });
  },
};

export const NoChooseWithoutRegions: Story = {
  args: { withRegions: false, calls: [] },
  play: async ({ args, canvas }) => {
    await expect(
      await canvas.findByRole('toolbar', { name: 'Draft' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Choose' })).toBeNull();
    await expect(chooseCalls(args.calls)).toHaveLength(0);
  },
};
