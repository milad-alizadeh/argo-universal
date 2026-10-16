import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentListView } from './agent-list-view';
import {
  agentListArgs,
  emptyCatalog,
  longCatalog,
  pageRows,
} from './agent-list-view.mocks';

const notInstalled = 'not-installed';

const exampleSearch = 'Example';

const unmatchedSearch = 'zzzz';

const meta = {
  title: 'Screens/Settings/Agents',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Agents: Story = {};

export const Search: Story = { args: { initialSearch: exampleSearch } };

export const Installed: Story = { args: { initialFilter: 'installed' } };

export const NotInstalled: Story = { args: { initialFilter: notInstalled } };

export const Loading: Story = {
  args: { agents: pageRows(undefined, { status: 'loading' }) },
};

export const RegistryError: Story = {
  args: { agents: pageRows(undefined, { status: 'failed' }) },
};

const noAgents = pageRows([], { status: 'loaded', registry: emptyCatalog });

export const Empty: Story = { args: { agents: noAgents } };

export const EmptyInstalled: Story = {
  args: { initialFilter: 'installed', agents: pageRows([]) },
};

export const EmptyNotInstalled: Story = {
  args: { initialFilter: notInstalled, agents: noAgents },
};

export const SearchEmpty: Story = { args: { initialSearch: unmatchedSearch } };

export const SearchEmptyInstalled: Story = {
  args: { initialSearch: unmatchedSearch, initialFilter: 'installed' },
};

export const SearchEmptyNotInstalled: Story = {
  args: { initialSearch: unmatchedSearch, initialFilter: notInstalled },
};

export const LongRegistry: Story = {
  args: {
    agents: pageRows([], { status: 'loaded', registry: longCatalog }),
  },
};
