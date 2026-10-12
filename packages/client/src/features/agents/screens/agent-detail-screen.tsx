import type { AgentInfo, CustomAgentDefinition } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import { AgentDetailView } from '../components/agent-detail-view/agent-detail-view';
import { AgentLoginSheet } from '../components/agent-login-sheet/agent-login-sheet';
import { AgentPlaceholder } from '../components/agent-placeholder';
import { CustomAgentDetailView } from '../components/custom-agent-detail-view/custom-agent-detail-view';
import { useAgentLogin } from '../hooks/use-agent-login';
import { useAgents } from '../hooks/use-agents';
import type { SubmitCustomAgent } from '../hooks/use-custom-agent-form';
import {
  useAgentCheck,
  useCustomAgentMutations,
  useCustomAgents,
} from '../hooks/use-custom-agents';
import { useSessionDefaults } from '../hooks/use-session-defaults';
import { agentDetail } from '../state/agent-detail';
import type { AgentDetail } from '../state/agent-detail-types';

export interface AgentDetailScreenProps {
  agent: string;
}
type PageProps = AgentDetailScreenProps & { onBack: () => void };

// Which page to draw waits for the custom Agents, so a custom Agent never shows the built-in page first.
type CustomDefinition =
  | { status: 'pending' }
  | { status: 'known'; definition?: CustomAgentDefinition };

function useCustomDefinition(agent: string): CustomDefinition {
  const { data } = useCustomAgents();
  if (!data) return { status: 'pending' };
  const custom = data.find(({ id }) => id === agent);
  return { status: 'known', definition: custom?.definition };
}

function useSaveAgent(agent: string): SubmitCustomAgent {
  const { edit } = useCustomAgentMutations();
  return (definition) => edit(agent, definition);
}

export function AgentDetailScreen({
  agent,
}: AgentDetailScreenProps): React.JSX.Element {
  const navigate = useNavigate();
  const onBack = (): void => navigate({ to: 'settings-agents' });
  const custom = useCustomDefinition(agent);
  if (custom.status === 'pending') return <AgentPlaceholder agent={agent} />;
  const { definition } = custom;
  if (!definition) return <AgentPage agent={agent} onBack={onBack} />;
  return <CustomAgentPage {...{ agent, definition, onBack }} />;
}

function CustomAgentPage(
  props: PageProps & { definition: CustomAgentDefinition },
): React.JSX.Element {
  const view = useCustomView(props);
  const login = useAgentLogin(props.agent);
  return (
    <LoginPage name={props.definition.name} login={login}>
      <CustomAgentDetailView {...view} onSignIn={login.start} />
    </LoginPage>
  );
}

function useAgentDetail(agent: string): {
  info: AgentInfo | undefined;
  detail: AgentDetail | undefined;
  retry: () => void;
} {
  const agents = useAgents();
  const catalog = useQuery(useTRPC().agents.catalog.queryOptions());
  const info = agents.data?.find((entry) => entry.agent === agent);
  const registry = catalog.data?.agents.find(({ id }) => id === agent);
  return { info, detail: agentDetail(info, registry), retry: agents.retry };
}

// A built-in or registry Agent: the Server's probe and the saved ACP Registry entry.
function AgentPage({ agent, onBack }: PageProps): React.JSX.Element {
  const login = useAgentLogin(agent);
  const view = useAgentPageView({ agent, onBack, onSignIn: login.start });
  if (!view) return <AgentPlaceholder agent={agent} />;
  return (
    <LoginPage name={view.agent.name} login={login}>
      <AgentDetailView {...view} />
    </LoginPage>
  );
}
function useAgentPageView(
  props: PageProps & { onSignIn: () => void },
): React.ComponentProps<typeof AgentDetailView> | undefined {
  const { info, detail, retry } = useAgentDetail(props.agent);
  const { defaults, change } = useSessionDefaults(info);
  if (!detail) return undefined;
  return {
    agent: detail,
    defaults,
    onDefaultChange: change,
    onBack: props.onBack,
    onCheckAgain: retry,
    onSignIn: props.onSignIn,
  };
}

type LoginPageProps = {
  name: string;
  login: ReturnType<typeof useAgentLogin>;
  children: React.ReactNode;
};
function LoginPage({
  name,
  login,
  children,
}: LoginPageProps): React.JSX.Element {
  return (
    <>
      {children}
      {login.sheet && <AgentLoginSheet agentName={name} {...login.sheet} />}
    </>
  );
}

function useCustomView(
  props: PageProps & { definition: CustomAgentDefinition },
): React.ComponentProps<typeof CustomAgentDetailView> {
  const check = useAgentCheck(props.agent, true);
  return {
    agentId: props.agent,
    definition: props.definition,
    check: check.isFetching ? undefined : check.data,
    onCheck: () => void check.refetch(),
    onSave: useSaveAgent(props.agent),
    onBack: props.onBack,
  };
}
