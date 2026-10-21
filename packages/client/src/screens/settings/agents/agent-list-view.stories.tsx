import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AgentListView } from './agent-list-view';
import { emptyCatalog, longCatalog, pageRows } from './agent-list-view.mocks';

const notInstalled = 'not-installed';

const exampleSearch = 'Example';

// The Registry loaded, with one of its Agents installed.
const loadedAgents = pageRows();

const noAgents = pageRows([], { status: 'loaded', registry: emptyCatalog });

const meta = {
  title: 'Screens/Settings/Agents',
  component: AgentListView,
  parameters: { screenPreview: true },
  argTypes: {
    agents: { control: false },
    initialSearch: { control: 'text' },
    initialFilter: {
      control: 'select',
      options: ['all', 'installed', notInstalled],
    },
  },
  args: { onInstall: fn(), onRemove: fn(), onRetry: fn() },
} satisfies Meta<typeof AgentListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Agents: Story = { args: { agents: loadedAgents } };

export const Search: Story = {
  args: { agents: loadedAgents, initialSearch: exampleSearch },
};

export const Installed: Story = {
  args: { agents: loadedAgents, initialFilter: 'installed' },
};

export const NotInstalled: Story = {
  args: { agents: loadedAgents, initialFilter: notInstalled },
};

export const Loading: Story = {
  args: { agents: pageRows(undefined, { status: 'loading' }) },
};

export const RegistryError: Story = {
  args: { agents: pageRows(undefined, { status: 'failed' }) },
};

/*
 * The Registry came back with nothing, so the catalog's empty section takes the cards' place. Its
 * sentence changes with the filter and the search, and `Tests/AgentListView` asserts all six.
 */
export const Empty: Story = { args: { agents: noAgents } };

export const LongRegistry: Story = {
  args: {
    agents: pageRows([], { status: 'loaded', registry: longCatalog }),
  },
};
