import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor, within } from 'storybook/test';
import { associationsOf } from '../../plugins/change-associations';
import { sayOperationFailed } from '../../plugins/say-operation-failed';
import {
  attached,
  ChangingSession,
  detached,
  harness,
} from './session-change-selection.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangeSelection',
  parameters: { screenPreview: true },
  render: (): JSX.Element => <ChangingSession />,
  beforeEach: (): Promise<void> => {
    detached.mockClear();
    attached.mockClear();

    return settleLayout(1920);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

type Canvas = Context['canvas'];

const remainder = '1 merged, 1 closed';

const backLabel = 'Back to Changes';

const ownedName = 'owner/app#12';

const forkedName = 'fork/app#12';

const mergedName = 'owner/app#9';

const ownedTitle = 'Add the Inspector list';

const forkedTitle = 'Same number in a fork';

const panelOf = (canvas: Canvas): ReturnType<typeof within> =>
  within(canvas.getByRole('tabpanel', { name: 'Changes' }));

const rowIn = (
  panel: ReturnType<typeof within>,
  name: string,
): Promise<HTMLElement> =>
  panel.findByRole('button', { name: new RegExp(`^Show Change ${name},`) });

async function openList({ canvas, userEvent }: Context): Promise<void> {
  await userEvent.click(await canvas.findByRole('button', { name: remainder }));
  await expect(await rowIn(panelOf(canvas), mergedName)).toBeVisible();
}

async function select(context: Context, name: string): Promise<void> {
  await context.userEvent.click(await rowIn(panelOf(context.canvas), name));
  await expect(
    await panelOf(context.canvas).findByRole('button', { name: backLabel }),
  ).toBeVisible();
}

const press = (context: Context, name: string): Promise<void> =>
  context.userEvent.click(context.canvas.getByRole('button', { name }));

// The card previews its Open Changes and groups the rest (here two Open, so the rest is the ended ones); the Inspector's list holds all of them, whatever their stage.
export const OverflowListsEveryChange: Story = {
  play: async (context) => {
    await expect(
      await context.canvas.findByRole('button', { name: remainder }),
    ).toBeVisible();
    await openList(context);

    const panel = panelOf(context.canvas);

    for (const name of [ownedName, forkedName, mergedName, 'owner/app#7'])
      await expect(await rowIn(panel, name)).toBeVisible();

    await expect(panel.queryByRole('button', { name: backLabel })).toBeNull();
  },
};

// Selecting a row opens that Change alone, and Back returns to the whole list.
export const SelectionOpensOneChangeAndBackReturns: Story = {
  play: async (context) => {
    await openList(context);
    await select(context, mergedName);

    const panel = panelOf(context.canvas);

    await expect(panel.getByText('Earlier work, merged')).toBeVisible();
    await expect(panel.queryByText(ownedTitle)).toBeNull();
    await expect(panel.queryByText(forkedTitle)).toBeNull();

    await context.userEvent.click(
      panel.getByRole('button', { name: backLabel }),
    );
    await expect(await rowIn(panel, ownedName)).toBeVisible();
    await expect(panel.queryByRole('button', { name: backLabel })).toBeNull();
  },
};

// A Workbench row opens its own Change, not the first one.
export const WorkbenchRowOpensItsChange: Story = {
  play: async ({ canvas, userEvent }) => {
    const [, forked] = await canvas.findAllByRole('button', {
      name: /^Open files of Change #12/,
    });

    if (!forked)
      throw new Error('Recorded Changes need two rows with number 12');

    await userEvent.click(forked);
    await expect(await panelOf(canvas).findByText(forkedTitle)).toBeVisible();
  },
};

// Equal numbers in two repositories are two Changes, and each detail names its own repository.
export const RepositoriesDoNotCollide: Story = {
  play: async (context) => {
    await openList(context);
    await select(context, forkedName);

    const panel = panelOf(context.canvas);

    await expect(panel.getByText(forkedTitle)).toBeVisible();
    await expect(panel.getByText(forkedName)).toBeVisible();
    await expect(panel.queryByText(ownedTitle)).toBeNull();
  },
};

// A refresh or a reorder of the Plugins' answer cannot move the selection to another Change.
export const SelectionSurvivesReorderAndRefresh: Story = {
  play: async (context) => {
    await openList(context);
    await select(context, forkedName);
    await press(context, harness.reorderLabel);
    await press(context, harness.refreshLabel);

    const panel = panelOf(context.canvas);

    await expect(panel.getByText(forkedTitle)).toBeVisible();
    await expect(panel.queryByText(ownedTitle)).toBeNull();
  },
};

// When the selected Change goes away the Inspector returns to the list; it never shows a neighbour in its place.
export const RemovedSelectionNeverSelectsAnother: Story = {
  play: async (context) => {
    await openList(context);
    await select(context, ownedName);
    await press(context, harness.removeLabel);

    const panel = panelOf(context.canvas);

    await expect(await rowIn(panel, forkedName)).toBeVisible();
    await expect(panel.queryByRole('button', { name: backLabel })).toBeNull();
    await expect(panel.queryByText(ownedTitle)).toBeNull();
  },
};

// A Change that goes away and comes back is not selected again: the person left it, so the list shows.
export const ReturnedChangeIsNotReselected: Story = {
  play: async (context) => {
    await openList(context);
    await select(context, ownedName);
    await press(context, harness.removeLabel);
    await press(context, harness.restoreLabel);

    const panel = panelOf(context.canvas);

    await expect(await rowIn(panel, ownedName)).toBeVisible();
    await expect(panel.queryByRole('button', { name: backLabel })).toBeNull();
  },
};

// Draft and conflict both hold, and the detail says both, with its own branch and a way to open it on GitHub.
export const DetailShowsItsOwnFacts: Story = {
  play: async (context) => {
    await openList(context);
    await select(context, ownedName);

    const panel = panelOf(context.canvas);

    await expect(panel.getByText('Draft')).toBeVisible();
    await expect(panel.getByText('Conflict')).toBeVisible();
    await expect(panel.getByText('feature/inspector into main')).toBeVisible();
    await expect(
      panel.getByRole('button', { name: 'Open on GitHub' }),
    ).toBeVisible();
  },
};

// Detaching removes only the selected association, and the Inspector is back on a list that still has the others.
export const DetachRemovesOnlyTheSelectedChange: Story = {
  play: async (context) => {
    await openList(context);
    await select(context, ownedName);
    await context.userEvent.click(
      panelOf(context.canvas).getByRole('button', { name: 'Detach' }),
    );

    await waitFor(() => expect(detached).toHaveBeenCalledTimes(1));
    await expect(detached.mock.calls[0]?.[0]).toMatchObject({
      id: 'github:owner/app#12',
    });

    const panel = panelOf(context.canvas);

    await expect(await rowIn(panel, forkedName)).toBeVisible();
    await expect(panel.queryByText(ownedTitle)).toBeNull();
  },
};

const typed = 'owner/app#20';

const referenceField = { name: 'Pull request' };

// The Inspector's list takes a reference and attaches it through the Session's `attach`.
export const AttachesTheTypedReference: Story = {
  play: async (context) => {
    await openList(context);

    const panel = panelOf(context.canvas);

    await context.userEvent.type(
      await panel.findByRole('textbox', referenceField),
      typed,
    );
    await context.userEvent.click(
      panel.getByRole('button', { name: 'Attach' }),
    );

    await waitFor(() => expect(attached).toHaveBeenCalledWith(typed));
    await waitFor(() =>
      expect(panel.getByRole('textbox', referenceField)).toHaveValue(''),
    );
  },
};

// Nothing typed, nothing to attach.
export const AttachNeedsAReference: Story = {
  play: async (context) => {
    await openList(context);
    await expect(
      panelOf(context.canvas).getByRole('button', { name: 'Attach' }),
    ).toBeDisabled();
    await expect(attached).not.toHaveBeenCalled();
  },
};

const refusing = associationsOf(
  {
    run: () => Promise.reject(new Error('Pull request not found.')),
    failed: sayOperationFailed,
  },
  { sessionId: 'session', projectId: 'project' },
);

// A refusal of the Operation shows through the App's failure toast, and the field keeps what was typed.
export const RefusalShowsTheFailureToast: Story = {
  render: (): JSX.Element => <ChangingSession actions={refusing} />,
  play: async (context) => {
    await openList(context);

    const panel = panelOf(context.canvas);

    await context.userEvent.type(
      await panel.findByRole('textbox', referenceField),
      typed,
    );
    await context.userEvent.click(
      panel.getByRole('button', { name: 'Attach' }),
    );

    await expect(await screen.findByText('That did not work')).toBeVisible();
    await expect(panel.getByRole('textbox', referenceField)).toHaveValue(typed);
  },
};
