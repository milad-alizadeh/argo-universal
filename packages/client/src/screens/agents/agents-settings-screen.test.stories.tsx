import type { AgentsCatalogOutput } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  agentCatalogMocks,
  catalog,
  unavailableCatalog,
} from '../../../mocks/agent-catalog-mock';
import { layoutWidths } from '../../../mocks/each-layout';
import { settleViewport } from '../../../mocks/settle-viewport';
import { createSubscriptionPublisher } from '../../../mocks/subscription-publisher';
import type { Fixtures } from '../../../mocks/trpc-mock-link';
import { fails } from '../../../mocks/trpc-mock-link';
import { AgentsSettingsScreen } from './agents-settings-screen';

const meta = {
  title: 'Tests/AgentsSettingsScreen',
  component: AgentsSettingsScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentsSettingsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
const admissionError = 'The Server is stopping';
const offlineError = 'Registry is offline';
const refreshLabel = 'Refresh catalog';
const disabledAttribute = 'aria-disabled';
const firstAgent = catalog.agents[0];
if (!firstAgent) throw new Error('Recorded catalog needs an Agent');
const firstAgentName = firstAgent.entry.name;

function syncStatus(
  status: 'pending' | 'running',
  outcome: 'idle' | 'failed',
): Story {
  let response: AgentsCatalogOutput = { ...catalog, syncStatus: status };
  const result: AgentsCatalogOutput = {
    ...catalog,
    syncStatus: outcome,
    status: outcome === 'failed' ? 'stale' : 'fresh',
    error: outcome === 'failed' ? offlineError : null,
  };
  const changes = createSubscriptionPublisher<string[]>();
  const fixtures: Fixtures = {
    ...agentCatalogMocks,
    'agents.catalog': () => response,
    'agents.catalogChanges': (_, signal) => changes.subscribe(signal),
  };
  return {
    parameters: { trpc: fixtures },
    beforeEach: () => {
      response = { ...catalog, syncStatus: status };
      changes.reset();
      return () => changes.reset();
    },
    play: async ({ canvas }) => {
      const refresh = canvas.getByRole('button', { name: refreshLabel });
      await waitFor(() =>
        expect(refresh).toHaveAttribute(disabledAttribute, 'true'),
      );
      await expect(canvas.getByText(firstAgentName)).toBeVisible();
      response = result;
      changes.publish([]);
      await waitFor(() =>
        expect(refresh).not.toHaveAttribute(disabledAttribute, 'true'),
      );
      await expect(canvas.getByText(firstAgentName)).toBeVisible();
      await expect(canvas.queryByText(offlineError) !== null).toBe(
        outcome === 'failed',
      );
    },
  };
}

export const PendingAfterAdmission: Story = syncStatus('pending', 'idle');
export const RunningUntilFailure: Story = syncStatus('running', 'failed');

const recoveredChanges = createSubscriptionPublisher<string[]>();
let recoveredCatalog = catalog;
export const CommittedCatalogClearsAdmissionFailure: Story = {
  parameters: {
    trpc: {
      ...agentCatalogMocks,
      'agents.syncCatalog': fails(admissionError),
      'agents.catalog': () => recoveredCatalog,
      'agents.catalogChanges': (_, signal) =>
        recoveredChanges.subscribe(signal),
    } satisfies Fixtures,
  },
  beforeEach: () => {
    recoveredCatalog = catalog;
    recoveredChanges.reset();
    return () => recoveredChanges.reset();
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole('alert')).toHaveTextContent(admissionError),
    );
    await expect(canvas.getByText(firstAgentName)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: refreshLabel }),
    ).not.toHaveAttribute(disabledAttribute, 'true');
    recoveredCatalog = { ...catalog, fetchedAt: 1791590400000 };
    recoveredChanges.publish([]);
    await waitFor(() =>
      expect(canvas.queryByRole('alert')).not.toBeInTheDocument(),
    );
    await expect(canvas.getByText(firstAgentName)).toBeVisible();
  },
};

function retryUnavailable(width: number): Story {
  let response = unavailableCatalog;
  let syncRequests = 0;
  const changes = createSubscriptionPublisher<string[]>();
  return {
    parameters: {
      trpc: {
        'agents.catalog': () => response,
        'agents.catalogChanges': (_, signal) => changes.subscribe(signal),
        'agents.syncCatalog': () => {
          syncRequests += 1;
          if (syncRequests > 1)
            response = { ...unavailableCatalog, syncStatus: 'pending' };
          return { accepted: true };
        },
      } satisfies Fixtures,
    },
    beforeEach: () => {
      response = unavailableCatalog;
      syncRequests = 0;
      changes.reset();
      return () => changes.reset();
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const retry = await canvas.findByRole('button', { name: 'Retry' });
      await waitFor(() =>
        expect(retry).not.toHaveAttribute(disabledAttribute, 'true'),
      );
      await userEvent.click(retry);
      await waitFor(() =>
        expect(retry).toHaveAttribute(disabledAttribute, 'true'),
      );
      response = catalog;
      changes.publish([]);
      await expect(await canvas.findByText(firstAgentName)).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Retry' }),
      ).not.toBeInTheDocument();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    },
  };
}

export const NoCatalogRetryPhone: Story = retryUnavailable(layoutWidths.phone);
export const NoCatalogRetryWide: Story = retryUnavailable(layoutWidths.wide);
