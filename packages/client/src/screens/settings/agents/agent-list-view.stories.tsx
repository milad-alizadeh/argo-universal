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

const meta = {
  title: 'Screens/Settings/Agents',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
  argTypes: {
    agents: { control: false },
    initialSearch: { control: 'text' },
    initialFilter: {
      control: 'select',
      options: ['all', 'installed', notInstalled],
    },
  },
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

/*
 * The Registry came back with nothing: the catalog's empty section takes the cards' place. The
 * label each filter and search pairs with is `Tests/AgentListView`'s, not a story of its own.
 */
export const Empty: Story = { args: { agents: noAgents } };

export const LongRegistry: Story = {
  args: {
    agents: pageRows([], { status: 'loaded', registry: longCatalog }),
  },
};
