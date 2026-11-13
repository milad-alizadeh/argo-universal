import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, within } from 'storybook/test';
import {
  ChangeFilesSession,
  ChangeFilesSheet,
  checkoutPath,
  forkedPath,
  mergedPath,
  ownedPath,
  ownedSecondPath,
  restoreLabel,
  unavailableMessage,
} from './session-change-files.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangeFiles',
  parameters: { screenPreview: true },
  render: (): JSX.Element => <ChangeFilesSession />,
  beforeEach: (): Promise<void> => settleLayout(1920),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const ownedName = 'owner/app#12';

const forkedName = 'fork/app#12';

const mergedName = 'owner/app#9';

const unavailable = { name: 'Files unavailable' };

const backLabel = { name: 'Back to Changes' };

type Named = { name: string };

const fileOf = (path: string): Named => ({ name: `Diff for ${path}` });

const rowOf = (name: string): Promise<HTMLElement> =>
  screen.findByRole('button', { name: new RegExp(`^Show Change ${name},`) });

const segment = (name: 'Change' | 'Files'): Promise<HTMLElement> =>
  screen.findByRole('button', { name });

// The Workbench groups the Changes beyond its preview; its remainder opens the Inspector's list on a wide window.
async function openList({ canvas, userEvent }: Context): Promise<void> {
  await userEvent.click(
    await canvas.findByRole('button', { name: '1 merged, 1 closed' }),
  );
  await expect(await rowOf(mergedName)).toBeVisible();
}

async function filesOf(
  { userEvent }: Pick<Context, 'userEvent'>,
  name: string,
): Promise<void> {
  await userEvent.click(await rowOf(name));
  await userEvent.click(await segment('Files'));
}

async function backToList({
  userEvent,
}: Pick<Context, 'userEvent'>): Promise<void> {
  await userEvent.click(await segment('Change'));
  await userEvent.click(await screen.findByRole('button', backLabel));
}

// The selected Change's Files segment lists that PR's own files, never the Session's Checkout's.
export const SelectedChangeShowsItsOwnFiles: Story = {
  play: async (context) => {
    await openList(context);
    await filesOf(context, ownedName);

    await expect(
      await screen.findByRole('button', fileOf(ownedPath)),
    ).toBeVisible();
    await expect(
      screen.getByRole('button', fileOf(ownedSecondPath)),
    ).toBeVisible();
    await expect(screen.queryByRole('button', fileOf(forkedPath))).toBeNull();
    await expect(screen.queryByRole('button', fileOf(checkoutPath))).toBeNull();
  },
};

// Back returns to the full list, and the next Change's files are its own: two PRs never share a list.
export const SwitchingChangesShowsEachOnesFiles: Story = {
  play: async (context) => {
    await openList(context);
    await filesOf(context, ownedName);
    await expect(
      await screen.findByRole('button', fileOf(ownedPath)),
    ).toBeVisible();

    await backToList(context);
    await filesOf(context, forkedName);

    await expect(
      await screen.findByRole('button', fileOf(forkedPath)),
    ).toBeVisible();
    await expect(screen.queryByRole('button', fileOf(ownedPath))).toBeNull();
    await expect(screen.queryByRole('button', fileOf(checkoutPath))).toBeNull();
  },
};

// A Change with no Change selected has the Checkout's own Files, which a PR's selection never replaces.
export const CheckoutFilesRemainWithoutASelection: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: '1 merged, 1 closed' }),
    );
    await userEvent.click(await segment('Files'));

    await expect(
      await screen.findByRole('button', fileOf(checkoutPath)),
    ).toBeVisible();
    await expect(screen.queryByRole('button', fileOf(ownedPath))).toBeNull();
  },
};

const panelOf = (): ReturnType<typeof within> =>
  within(screen.getByRole('tabpanel', { name: 'Changes' }));

// A comparison GitHub cannot give says so for that Change, names it, offers a retry, and shows no other files.
export const UnavailableFilesKeepTheChange: Story = {
  play: async (context) => {
    await openList(context);
    await filesOf(context, mergedName);

    const panel = panelOf();

    await expect(await panel.findByRole('heading', unavailable)).toBeVisible();
    await expect(
      panel.getByText(new RegExp(`${mergedName}.*${unavailableMessage}`)),
    ).toBeVisible();
    await expect(panel.queryByRole('button', fileOf(checkoutPath))).toBeNull();
    await expect(panel.queryByRole('button', fileOf(ownedPath))).toBeNull();

    await context.userEvent.click(await segment('Change'));
    await expect(panel.getByText('Earlier work, merged')).toBeVisible();
  },
};

// Try again reads the files again: still refused it stays unavailable, and once GitHub answers they are the Change's own.
export const RetryReadsTheFilesAgain: Story = {
  play: async (context) => {
    await openList(context);
    await filesOf(context, mergedName);

    const panel = panelOf();
    const retry = await panel.findByRole('button', { name: 'Try again' });

    await context.userEvent.click(retry);
    await expect(await panel.findByRole('heading', unavailable)).toBeVisible();

    await context.userEvent.click(
      screen.getByRole('button', { name: restoreLabel }),
    );
    await context.userEvent.click(
      await panel.findByRole('button', { name: 'Try again' }),
    );

    await expect(
      await panel.findByRole('button', fileOf(mergedPath)),
    ).toBeVisible();
    await expect(panel.queryByRole('heading', unavailable)).toBeNull();
  },
};

const onPhone = (): JSX.Element => <ChangeFilesSheet />;

// A phone's sheet reaches the same files through the same list, Change, Files and Back.
export const PhoneSheetShowsTheSelectedChangesFiles: Story = {
  render: onPhone,
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ userEvent }) => {
    await userEvent.click(await segment('Change'));
    await userEvent.click(await rowOf(forkedName));
    await userEvent.click(await segment('Files'));

    await expect(
      await screen.findByRole('button', fileOf(forkedPath)),
    ).toBeVisible();
    await expect(screen.queryByRole('button', fileOf(ownedPath))).toBeNull();
    await expect(screen.queryByRole('button', fileOf(checkoutPath))).toBeNull();

    await userEvent.click(await segment('Change'));
    await userEvent.click(screen.getByRole('button', backLabel));
    await expect(await rowOf(ownedName)).toBeVisible();
  },
};

// The phone's sheet also says when a Change's files are unavailable, keeping the Change.
export const PhoneSheetSaysFilesAreUnavailable: Story = {
  render: onPhone,
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ userEvent }) => {
    await userEvent.click(await segment('Change'));
    await userEvent.click(await rowOf(mergedName));
    await userEvent.click(await segment('Files'));

    await expect(await screen.findByRole('heading', unavailable)).toBeVisible();
    await expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeVisible();
  },
};
