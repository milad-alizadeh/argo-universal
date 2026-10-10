import type * as React from 'react';
import { useState } from 'react';
import { useNavigate } from '#lib/product/navigation/context';
import {
  AgentsSettingsView,
  type AgentsSettingsViewProps,
} from '../components/agents-settings-view';
import { useAgentCatalog } from '../hooks/use-agent-catalog';
import { useCustomAgents } from '../hooks/use-custom-agents';

type CustomAgentProps = Pick<
  AgentsSettingsViewProps,
  'customAgents' | 'onAddCustomAgent' | 'onOpenCustomAgent'
>;

function useCustomAgentProps(): CustomAgentProps {
  const navigate = useNavigate();
  const agents = useCustomAgents().data ?? [];
  return {
    customAgents: agents.map(({ id, definition }) => ({
      id,
      name: definition.name,
    })),
    onAddCustomAgent: () => navigate({ to: 'settings-agent-new' }),
    onOpenCustomAgent: (agent) => navigate({ to: 'settings-agent', agent }),
  };
}

export function AgentsSettingsScreen(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const { load, refreshing, refresh } = useAgentCatalog(search);
  return (
    <AgentsSettingsView
      search={search}
      onSearch={setSearch}
      catalog={load}
      refreshing={refreshing}
      onRefresh={refresh}
      {...useCustomAgentProps()}
    />
  );
}
