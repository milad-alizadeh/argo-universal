import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  homebrewCopy,
  installationArgs,
  managementArgs,
  outdated,
  serverName,
  unknownCopy,
} from './agent-detail.mocks';

const { name } = homebrewCopy;

const meta = {
  title: 'Tests/Screens/Settings/Agent outside copy',
  component: AgentDetailView,
  args: {
    ...agentDetailArgs(),
    agent: homebrewCopy,
    management: managementArgs(),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = keyof typeof layoutWidths;

const body = within(document.body);

const disableLabel = `Disable ${name}`;

// Homebrew owns the copy: Argo names it and offers Disable, never Remove.
const ownedByHomebrew = (layout: Layout): Story => ({
  beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('Installed with Homebrew')).toBeVisible();
    await expect(canvas.queryByText(/^Remove /)).not.toBeInTheDocument();
    await expect(
      canvas.getByText(
        'Homebrew owns this copy, so Argo won’t remove it. Disable hides it from new Sessions.',
      ),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: disableLabel }));
    await expect(args.management?.onEnabledChange).toHaveBeenCalledWith(false);
    await expect(args.onRemove).not.toHaveBeenCalled();
  },
});

export const HomebrewCopyOffersDisableOnDesktop = ownedByHomebrew('wide');

export const HomebrewCopyOffersDisableOnPhone = ownedByHomebrew('phone');

export const NpmCopyIsNamedForNpm: Story = {
  args: {
    agent: { ...homebrewCopy, owner: 'npm', source: 'Installed with npm' },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Installed with npm')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: disableLabel }),
    ).toBeVisible();
  },
};

const updateYourself = `Update ${name} yourself`;

const openUpdateAlert = async (
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
): Promise<ReturnType<typeof within>> => {
  const [update] = await canvas.findAllByRole('button', { name: 'Update' });

  if (update) await userEvent.click(update);

  return within(await body.findByRole('dialog', { name: updateYourself }));
};

// Update on an outside copy runs nothing: the Alert shows the owner's command to copy.
export const UpdateShowsTheOwnersCommand: Story = {
  args: {
    agent: outdated(homebrewCopy, 'brew upgrade example-agent'),
    installation: installationArgs({ action: 'Update' }),
  },
  play: async ({ args, canvas, userEvent }) => {
    const alert = await openUpdateAlert(canvas, userEvent);
    await waitFor(() =>
      expect(alert.getByText('brew upgrade example-agent')).toBeVisible(),
    );
    await expect(
      alert.getByText(
        `Homebrew installed ${name}, so Argo won’t update it. Run this on ${serverName}:`,
      ),
    ).toBeVisible();
    await expect(
      alert.getByRole('button', { name: 'Copy command' }),
    ).toBeVisible();
    await userEvent.click(alert.getByRole('button', { name: 'Close' }));
    await expect(args.installation?.onConfirmingChange).not.toHaveBeenCalled();
    await expect(args.installation?.onInstall).not.toHaveBeenCalled();
    await expect(args.onUpdate).not.toHaveBeenCalled();
  },
};

// Nothing says what installed an unknown copy, so the Alert names the release and where the copy is.
export const UpdateNamesTheVersionAndPathWithoutAnOwner: Story = {
  args: {
    agent: outdated(unknownCopy),
    installation: installationArgs({ action: 'Update' }),
  },
  play: async ({ canvas, userEvent }) => {
    const alert = await openUpdateAlert(canvas, userEvent);
    await waitFor(() =>
      expect(
        alert.getByText(
          `Argo didn’t install ${name} and can’t tell what did. Update the copy at ${unknownCopy.path ?? ''} to v1.3.0 on ${serverName}.`,
        ),
      ).toBeVisible(),
    );
    await expect(
      alert.queryByRole('button', { name: 'Copy command' }),
    ).not.toBeInTheDocument();
  },
};
