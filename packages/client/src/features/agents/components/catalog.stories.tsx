import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { catalog, unavailableCatalog } from '../../../../mocks/agents-mock';
import { AgentCatalog } from './catalog';

const meta = {
  title: 'Components/AgentCatalog',
  component: AgentCatalog,
  args: { catalog, search: '', retry: { refresh: fn(), refreshing: false } },
  parameters: { screenPreview: true },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="flex-1 bg-background p-4">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof AgentCatalog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RefreshFailed: Story = {
  args: {
    catalog: {
      ...catalog,
      status: 'stale',
      syncStatus: 'failed',
      error: 'Registry is offline',
    },
  },
};

export const NoMatches: Story = {
  args: { catalog: { ...catalog, agents: [] }, search: 'mistral' },
};

export const NoSavedCatalog: Story = {
  render: function RetryCatalog(args): React.JSX.Element {
    const [saved, setSaved] = useState(args.catalog);
    return (
      <AgentCatalog
        {...args}
        catalog={saved}
        retry={{ refresh: (): void => setSaved(catalog), refreshing: false }}
      />
    );
  },
  args: { catalog: unavailableCatalog },
};
