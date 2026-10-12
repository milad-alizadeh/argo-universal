import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { findToast } from '../../../../mocks/find-toast';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import type { CatalogLoad } from '../state/catalog-sync';
import { AgentListView } from './agent-list-view';
import {
  catalog,
  emptyCatalog,
  failedSyncCatalog,
  unavailableCatalog,
  agentListArgs,
  agentLink,
} from './agent-list-view.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agents',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentListView>;
export default meta;
type Story = StoryObj<typeof meta>;

const syncError = 'Registry is offline';
const loadingRow = 'Loading the Agent catalog…';
const firstAgent = catalog.agents[0];
if (!firstAgent) throw new Error('Recorded catalog needs an Agent');
const registryName = firstAgent.entry.name;
const emptyLoad: CatalogLoad = { status: 'loaded', catalog: emptyCatalog };

export const ShowsLoadingUntilTheCatalogArrives: Story = {
  args: { catalog: { status: 'loading' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: loadingRow })).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: 'Agents for this Server' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('link', { name: agentLink('First Agent') }),
    ).toBeVisible();
  },
};

export const ShowsNoMatchesForASearch: Story = {
  args: { initialSearch: 'mistral' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'No Agents match “mistral”' }),
    ).toBeVisible();
    await expect(canvas.getByText('Check the spelling.')).toBeVisible();
  },
};

export const ToastsACatalogTheServerCouldNotRead: Story = {
  args: { catalog: { status: 'failed', message: 'The Server is stopping' } },
  play: async ({ canvas }) => {
    await expect(
      await findToast('Couldn’t load the Agent catalog'),
    ).toBeVisible();
    await expect(canvas.getByRole('group', { name: loadingRow })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Retry' })).toBeNull();
  },
};

export const ShowsAnEmptyCatalog: Story = {
  args: { catalog: emptyLoad, installed: [] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'No Agents found.' }),
    ).toBeVisible();
    await expect(canvas.queryByText('Check the spelling.')).toBeNull();
  },
};

export const KeepsTheSavedCatalogAfterAFailedSync: Story = {
  args: { catalog: { status: 'loaded', catalog: failedSyncCatalog } },
  play: async ({ canvas }) => {
    await expect(
      await findToast('Refresh failed · showing saved catalog'),
    ).toBeVisible();
    await expect(await findToast(syncError)).toBeVisible();
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(
      canvas.getByRole('link', { name: agentLink(registryName) }),
    ).toBeVisible();
  },
};

function toastsUnavailable(width: number): Story {
  return {
    args: { catalog: { status: 'loaded', catalog: unavailableCatalog } },
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas }) => {
      await expect(await findToast('Couldn’t load the registry')).toBeVisible();
      await expect(
        await findToast(`No saved catalog yet. ${syncError}`),
      ).toBeVisible();
      await expect(
        canvas.getByRole('heading', { name: 'Agents for this Server · macOS' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('link', { name: agentLink('First Agent') }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('group', { name: loadingRow }),
      ).toBeVisible();
    },
  };
}

export const NoSavedCatalogToastPhone: Story = toastsUnavailable(
  layoutWidths.phone,
);
export const NoSavedCatalogToastWide: Story = toastsUnavailable(
  layoutWidths.wide,
);
