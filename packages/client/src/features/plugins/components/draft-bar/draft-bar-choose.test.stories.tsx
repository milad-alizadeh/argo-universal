import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  ChooseBarMock,
  type ChooseCall,
} from '../../hooks/draft-bar-choose.mocks';
import type { DraftNote } from '../../stores/draft-comments';

const note: DraftNote = {
  address: 'list/row-409',
  nodeKey: 'row-409',
  region: 'list',
  variant: 'rows',
  note: 'Use a coloured chip',
};

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

export const ChooseCarriesTheComments: Story = {
  args: {
    notes: [note, { address: 'title', nodeKey: 'title', note: 'Bigger' }],
    calls: [],
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Choose · 2 comments' }),
    );

    await waitFor(() => expect(chooseCalls(args.calls)).toHaveLength(1));
    await expect(chooseCalls(args.calls)[0]?.input).toMatchObject({
      comments: [
        {
          nodeKey: 'row-409',
          region: 'list',
          variant: 'rows',
          note: 'Use a coloured chip',
        },
        { nodeKey: 'title', note: 'Bigger' },
      ],
    });
    // Sent, the notes are gone and Choose is as it was.
    await expect(
      await canvas.findByRole('button', { name: 'Choose' }),
    ).toBeVisible();
  },
};

export const RegionlessDraftChoosesOnceItHasAComment: Story = {
  args: { withRegions: false, notes: [note], calls: [] },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Choose · 1 comment' }),
    );

    await waitFor(() => expect(chooseCalls(args.calls)).toHaveLength(1));
    await expect(chooseCalls(args.calls)[0]?.input).toMatchObject({
      picks: [],
      comments: [{ nodeKey: 'row-409' }],
    });
  },
};
