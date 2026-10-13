import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import type { AgentDetailViewProps } from '../../state/agent-detail-types';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  installationArgs,
  readyAgent,
  registryAgent,
  serverName,
} from './agent-detail.mocks';

const version = readyAgent.version;
if (!version) throw new Error('Agent fixture needs a version');
const meta = {
  title: 'Tests/Screens/Settings/Agent installation',
  component: AgentDetailView,
  args: {
    ...agentDetailArgs(),
    agent: registryAgent,
    installation: installationArgs(),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

const installation = (
  args: AgentDetailViewProps,
): NonNullable<AgentDetailViewProps['installation']> => {
  if (!args.installation) throw new Error('Story needs an installation');
  return args.installation;
};
const busy = ['aria-disabled', 'true'] as const;
const confirmation = async (name: string): Promise<HTMLElement> =>
  within(document.body).findByRole('dialog', { name });

const asks = (width: number): Story => ({
  beforeEach: (): Promise<void> => settleViewport(width),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Install' }));
    await expect(installation(args).onConfirmingChange).toHaveBeenCalledWith(
      true,
    );
    await expect(installation(args).onInstall).not.toHaveBeenCalled();
  },
});
export const AsksBeforeInstalling = asks(layoutWidths.wide);
export const AsksBeforeInstallingOnAPhone = asks(layoutWidths.phone);

export const NamesTheReleaseAndTheServer: Story = {
  args: { installation: installationArgs({ confirming: true }) },
  play: async () => {
    const dialog = await confirmation(`Install ${readyAgent.name}?`);
    await expect(dialog).toHaveTextContent(
      `Version ${version} · npm. Installs on ${serverName}. Sign-in is checked separately.`,
    );
  },
};

export const CancelStartsNothing: Story = {
  args: { installation: installationArgs({ confirming: true }) },
  play: async ({ args, userEvent }) => {
    const dialog = within(await confirmation(`Install ${readyAgent.name}?`));
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await expect(installation(args).onConfirmingChange).toHaveBeenCalledWith(
      false,
    );
    await expect(installation(args).onInstall).not.toHaveBeenCalled();
  },
};

// The page owns the confirmation, so answering closes it like the screen does.
function ConfirmingAgentPage(args: AgentDetailViewProps): React.JSX.Element {
  const [confirming, setConfirming] = useState(true);
  return (
    <AgentDetailView
      {...args}
      installation={{
        ...installation(args),
        confirming,
        onConfirmingChange: setConfirming,
      }}
    />
  );
}
export const RepeatedPressesStartOneInstallation: Story = {
  render: (args) => <ConfirmingAgentPage {...args} />,
  play: async ({ args, userEvent }) => {
    const dialog = within(await confirmation(`Install ${readyAgent.name}?`));
    await userEvent.dblClick(dialog.getByRole('button', { name: 'Install' }));
    await expect(installation(args).onInstall).toHaveBeenCalledOnce();
    await expect(
      within(document.body).queryByRole('dialog'),
    ).not.toBeInTheDocument();
  },
};

const inProgress = (width: number): Story => ({
  args: { installation: installationArgs({ installing: true }) },
  beforeEach: (): Promise<void> => settleViewport(width),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Installing…' }),
    ).toHaveAttribute(...busy);
    await expect(
      canvas.queryByRole('button', { name: 'Install' }),
    ).not.toBeInTheDocument();
  },
});
export const ShowsProgressInPlace = inProgress(layoutWidths.wide);
export const ShowsProgressInPlaceOnAPhone = inProgress(layoutWidths.phone);

export const ShowsAnUpdateInPlace: Story = {
  args: {
    agent: { ...readyAgent, status: 'update' },
    installation: installationArgs({ action: 'Update', installing: true }),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Updating…' }),
    ).toHaveAttribute(...busy);
  },
};
