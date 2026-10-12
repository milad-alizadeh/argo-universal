import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { AgentListView } from './agent-list-view';
import {
  agentLink,
  agentListArgs,
  catalog,
  installedAgents,
} from './agent-list-view.mocks';
import { customAgentDefinition, customAgentId } from './custom-agent.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agents list',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentListView>;
export default meta;
type Story = StoryObj<typeof meta>;

const firstAgent = catalog.agents[0];
if (!firstAgent) throw new Error('Recorded catalog needs an Agent');
const registryName = firstAgent.entry.name;
const searchLabel = 'Search Agents';
const [firstName = '', secondName = ''] = installedAgents.map(
  ({ name }) => name,
);
// A row reads its name, then its description when it has one, then its status.
const withStatus = (name: string, status: string): RegExp =>
  new RegExp(`^${name}, (.+, )?${status}$`);

export const ShowsInstalledAndRegistryAgentsWithTheirStatus: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: withStatus(firstName, 'Ready') }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('link', {
        name: withStatus(secondName, 'Sign-in needed'),
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('link', {
        name: withStatus(registryName, 'Not installed'),
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: 'Available for macOS' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const HasNoRefreshButton: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('button', { name: /Refresh/ }),
    ).not.toBeInTheDocument();
  },
};

export const FiltersByThePills: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', {
        name: `Installed, ${installedAgents.length}`,
      }),
    );
    await expect(
      canvas.queryByRole('link', { name: agentLink(registryName) }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: withStatus(firstName, 'Ready') }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: /^Not installed, \d+$/ }),
    );
    await expect(
      canvas.queryByRole('link', { name: agentLink(firstName) }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('link', {
        name: withStatus(registryName, 'Not installed'),
      }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'All' }));
    await expect(
      canvas.getByRole('link', { name: agentLink(registryName) }),
    ).toBeVisible();
  },
};

export const SearchesTheAgents: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: searchLabel }));
    const search = canvas.getByRole('textbox', { name: searchLabel });
    await userEvent.type(search, 'second');
    await expect(
      canvas.getByRole('link', { name: agentLink(secondName) }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('link', { name: agentLink(firstName) }),
    ).not.toBeInTheDocument();
    await userEvent.clear(search);
    await expect(
      canvas.getByRole('link', { name: agentLink(firstName) }),
    ).toBeVisible();
  },
};

export const AddsACustomAgent: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Add custom Agent' }),
    );
    await expect(args.onAddCustomAgent).toHaveBeenCalledOnce();
  },
};

export const OpensAnAgent: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('link', { name: agentLink(customAgentDefinition.name) }),
    );
    await expect(args.onOpenAgent).toHaveBeenCalledWith(customAgentId);
  },
};
