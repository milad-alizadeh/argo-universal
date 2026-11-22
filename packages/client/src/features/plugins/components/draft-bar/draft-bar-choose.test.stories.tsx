import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  ChooseBarMock,
  type ChooseCall,
  type ChooseReply,
} from '../../hooks/draft-bar-choose.mocks';
import type { DraftNote } from '../../stores/draft-comments';
import { leftNotes } from '../draft-comment/draft-comment-fixtures';

const note: DraftNote = {
  address: 'list/row-409',
  nodeKey: 'row-409',
  region: 'list',
  variant: 'rows',
  note: 'Use a coloured chip',
};

const pressed = 'aria-pressed';

const chooseWithTwoComments = 'Choose · 2 comments';

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
      await canvas.findByRole('button', { name: chooseWithTwoComments }),
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

const reviewedNotes: DraftNote[] = [
  note,
  { address: 'title', nodeKey: 'title', note: 'Bigger' },
];

export const DeliveredShowsWhatWasSent: Story = {
  args: { calls: [], notes: reviewedNotes },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: chooseWithTwoComments }),
    );
    const status = await canvas.findByRole('status');

    await expect(status).toHaveTextContent('Sent to drawing Session');
    await expect(status).toHaveTextContent(
      'Your picks and 2 comments were sent.',
    );
    await expect(canvas.getByRole('button', { name: 'Choose' })).toBeVisible();
  },
};

function rejectedChoice(
  reply: ChooseReply,
  title: string,
  explanation: string,
): Story {
  return {
    args: { calls: [], notes: reviewedNotes, reply },
    play: async ({ canvas, userEvent }) => {
      const choose = await canvas.findByRole('button', {
        name: chooseWithTwoComments,
      });

      await userEvent.click(choose);
      const alert = await canvas.findByRole('alert');

      await expect(alert).toHaveTextContent(title);
      await expect(alert).toHaveTextContent(explanation);
      await expect(choose).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(choose).toBeVisible();
    },
  };
}

export const RefusedNamesTheUnavailableVariant = rejectedChoice(
  'unavailable',
  'Couldn’t send your choice',
  'The Rows Variant is no longer available. Pick another Variant and choose again.',
);

export const ChooseBeforeShowExplainsHowToRecover = rejectedChoice(
  'no-session',
  'No drawing Session yet',
  'Ask the Agent in your drafting Session to show this Draft, then choose again.',
);

export const DarkCommentsUseANeutralToggleAndSolidPins: Story = {
  globals: { mode: 'dark' },
  args: { calls: [], commenting: true, showPage: true, notes: leftNotes },
  play: async ({ canvas, userEvent }) => {
    const toggle = await canvas.findByRole('button', { name: 'Comments' });
    const pin = await canvas.findByRole('img', { name: 'Comment 1' });

    await expect(toggle).toHaveAttribute(pressed, 'true');
    await expect(toggle.getBoundingClientRect().width).toBe(34);
    await expect(pin.getBoundingClientRect().width).toBe(23);
    await expect(canvas.getByRole('img', { name: 'Comment 2' })).toBeVisible();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(pressed, 'false');
  },
};

export const ARefusalShowsSavedPinsWithCommentsOff: Story = {
  args: { calls: [], showPage: true, notes: leftNotes, reply: 'unavailable' },
  play: async ({ canvas, userEvent }) => {
    const toggle = await canvas.findByRole('button', { name: 'Comments' });

    await expect(toggle).toHaveAttribute(pressed, 'false');
    await userEvent.click(
      await canvas.findByRole('button', { name: chooseWithTwoComments }),
    );
    await canvas.findByRole('alert');
    await expect(
      await canvas.findByRole('img', { name: 'Comment 1' }),
    ).toBeVisible();
    await expect(
      await canvas.findByRole('img', { name: 'Comment 2' }),
    ).toBeVisible();
    await expect(toggle).toHaveAttribute(pressed, 'false');
    await expect(
      canvas.queryByRole('button', { name: /Comment on/ }),
    ).toBeNull();
  },
};
