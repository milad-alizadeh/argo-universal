import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { AgentsSettingsView } from './agents-settings-view';
import {
  catalog,
  failedSyncCatalog,
  unavailableCatalog,
  agentsSettingsArgs,
} from './agents-settings-view.mocks';

const meta = {
  title: 'Screens/AgentsSettingsScreen',
  component: AgentsSettingsView,
  args: agentsSettingsArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentsSettingsView>;
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
    catalog: { status: 'loaded', catalog: { ...catalog, agents: [] } },
    customAgents: [],
  },
};

export const RefreshFailed: Story = {
  args: { catalog: { status: 'loaded', catalog: failedSyncCatalog } },
};

export const NoMatches: Story = {
  args: {
    search: 'mistral',
    catalog: { status: 'loaded', catalog: { ...catalog, agents: [] } },
  },
};

export const Refreshing: Story = { args: { refreshing: true } };

export const NoSavedCatalog: Story = {
  render: function RetryCatalog(args): React.JSX.Element {
    const [saved, setSaved] = useState(unavailableCatalog);
    return (
      <AgentsSettingsView
        {...args}
        catalog={{ status: 'loaded', catalog: saved }}
        onRefresh={(): void => setSaved(catalog)}
      />
    );
  },
};
