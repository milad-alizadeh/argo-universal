import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentListView } from './agent-list-view';
import {
  failedSyncCatalog,
  unavailableCatalog,
  agentListArgs,
  emptyCatalog,
  longCatalog,
} from './agent-list-view.mocks';

const meta = {
  title: 'Screens/Settings/Agents',
  component: AgentListView,
  args: agentListArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentListView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const Loading: Story = { args: { catalog: { status: 'loading' } } };

// Named so it does not shadow the global Error.
export const ErrorState: Story = {
  name: 'Error',
  args: {
    catalog: { status: 'failed', message: 'The Server is stopping' },
  },
};

export const Empty: Story = {
  args: {
    catalog: { status: 'loaded', catalog: emptyCatalog },
    installed: [],
  },
};

export const RefreshFailed: Story = {
  args: { catalog: { status: 'loaded', catalog: failedSyncCatalog } },
};

export const NoMatches: Story = {
  args: {
    initialSearch: 'mistral',
    catalog: { status: 'loaded', catalog: emptyCatalog },
  },
};

export const LongCatalog: Story = {
  args: { catalog: { status: 'loaded', catalog: longCatalog } },
};

export const NotInstalled: Story = {
  args: { initialFilter: 'not-installed' },
};

export const NoSavedCatalog: Story = {
  args: { catalog: { status: 'loaded', catalog: unavailableCatalog } },
};
