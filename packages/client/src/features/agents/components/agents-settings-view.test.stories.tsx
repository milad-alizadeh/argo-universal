import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import type { CatalogLoad } from '../state/catalog-sync';
import { AgentsSettingsView } from './agents-settings-view';
import {
  catalog,
  failedSyncCatalog,
  unavailableCatalog,
  agentsSettingsArgs,
  emptyCatalog,
} from './agents-settings-view.mocks';
import { customAgentDefinition, customAgentId } from './custom-agent.mocks';

const meta = {
  title: 'Tests/AgentsSettingsScreen',
  component: AgentsSettingsView,
  args: agentsSettingsArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentsSettingsView>;
export default meta;
type Story = StoryObj<typeof meta>;

const refreshLabel = 'Refresh catalog';
const disabledAttribute = 'aria-disabled';
const syncError = 'Registry is offline';
const firstAgent = catalog.agents[0];
if (!firstAgent) throw new Error('Recorded catalog needs an Agent');
const firstAgentName = firstAgent.entry.name;
const emptyLoad: CatalogLoad = {
  status: 'loaded',
  catalog: emptyCatalog,
};

export const ShowsTheCatalogAndCustomAgents: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(String(catalog.agents.length))).toBeVisible();
    await expect(canvas.getByText(firstAgentName)).toBeVisible();
    await expect(
      canvas.getByRole('link', { name: customAgentDefinition.name }),
    ).toBeVisible();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const ShowsLoadingUntilTheCatalogArrives: Story = {
  args: { catalog: { status: 'loading' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Loading the Agent catalog…',
    );
    await expect(canvas.queryByText(firstAgentName)).not.toBeInTheDocument();
  },
};

export const RetriesACatalogTheServerCouldNotRead: Story = {
  args: { catalog: { status: 'failed', message: 'The Server is stopping' } },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'The Server is stopping',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRefresh).toHaveBeenCalledOnce();
  },
};

export const ShowsAnEmptyCatalog: Story = {
  args: { catalog: emptyLoad },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No Agents found.')).toBeVisible();
    await expect(canvas.queryByText('Check the spelling.')).toBeNull();
  },
};

export const ShowsNoMatchesForASearch: Story = {
  args: { catalog: emptyLoad, search: 'mistral' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No Agents match “mistral”')).toBeVisible();
    await expect(canvas.getByText('Check the spelling.')).toBeVisible();
  },
};

export const KeepsTheSavedCatalogAfterAFailedSync: Story = {
  args: { catalog: { status: 'loaded', catalog: failedSyncCatalog } },
  play: async ({ canvas }) => {
    const notice = canvas.getByRole('alert');
    await expect(notice).toHaveTextContent(
      'Refresh failed · showing saved catalog',
    );
    await expect(notice).toHaveTextContent(syncError);
    await expect(canvas.getByText(firstAgentName)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: refreshLabel }),
    ).not.toHaveAttribute(disabledAttribute, 'true');
  },
};

export const DisablesRefreshWhileTheCatalogSyncs: Story = {
  args: { refreshing: true },
  play: async ({ canvas }) => {
    const refresh = canvas.getByRole('button', { name: refreshLabel });
    await expect(refresh).toHaveAttribute(disabledAttribute, 'true');
    await expect(refresh).toHaveTextContent('Refreshing…');
    await expect(canvas.getByText(firstAgentName)).toBeVisible();
  },
};

export const RefreshesTheCatalog: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: refreshLabel }));
    await expect(args.onRefresh).toHaveBeenCalledOnce();
  },
};

export const AddsACustomAgent: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add custom' }));
    await expect(args.onAddCustomAgent).toHaveBeenCalledOnce();
  },
};

export const OpensACustomAgent: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('link', { name: customAgentDefinition.name }),
    );
    await expect(args.onOpenCustomAgent).toHaveBeenCalledWith(customAgentId);
  },
};

function retryUnavailable(width: number): Story {
  return {
    args: { catalog: { status: 'loaded', catalog: unavailableCatalog } },
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ args, canvas, userEvent }) => {
      const alert = canvas.getByRole('alert');
      await expect(alert).toHaveTextContent('Couldn’t load the registry');
      await expect(alert).toHaveTextContent(syncError);
      await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
      await expect(args.onRefresh).toHaveBeenCalledOnce();
    },
  };
}

export const NoCatalogRetryPhone: Story = retryUnavailable(layoutWidths.phone);
export const NoCatalogRetryWide: Story = retryUnavailable(layoutWidths.wide);

export const NoCatalogRetryWaitsForTheSync: Story = {
  args: {
    catalog: { status: 'loaded', catalog: unavailableCatalog },
    refreshing: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Retry' })).toHaveAttribute(
      disabledAttribute,
      'true',
    );
  },
};
