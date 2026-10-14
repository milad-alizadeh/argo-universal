import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/context';
import { AgentDetailView } from '../components/agent-detail-view/agent-detail-view';
import { AgentLoginSheet } from '../components/agent-login-sheet/agent-login-sheet';
import { AgentPlaceholder } from '../components/agent-placeholder';
import { CustomAgentDetailView } from '../components/custom-agent-detail-view/custom-agent-detail-view';
import { useAgentPageView } from '../hooks/use-agent-detail';
import { useAgentLogin } from '../hooks/use-agent-login';
import { useAgentManagement } from '../hooks/use-agent-management';
import { useAgents, useRecheck } from '../hooks/use-agents';
import type { SubmitCustomAgent } from '../hooks/use-custom-agent-form';
import {
  useCustomAgentMutations,
  useCustomAgents,
} from '../hooks/use-custom-agents';
import { listedStatus } from '../state/agent-list';

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
  const { pending, ...readiness } = useCheckedReadiness(props.agent);
  const management = useAgentManagement(props.agent, props.onBack);
  return {
    agentId: props.agent,
    definition: props.definition,
    ...readiness,
    onSave: useSaveAgent(props.agent),
    onBack: props.onBack,
    management: checkedManagement(management, pending),
  };
}
type CustomViewProps = React.ComponentProps<typeof CustomAgentDetailView>;
// A Recheck in flight reads as Checking… and cannot be asked for twice.
function useCheckedReadiness(
  agent: string,
): Pick<CustomViewProps, 'readiness' | 'onRecheck'> & { pending: boolean } {
  const saved = useSavedReadiness(agent);
  const { pending, run } = useRecheck(agent);
  if (pending) return { pending, readiness: { status: 'checking' } };
  return { pending, readiness: saved, onRecheck: run };
}
// The Agent's saved Readiness from the Agents list; Checking… until the list has it.
function useSavedReadiness(
  agent: string,
): React.ComponentProps<typeof CustomAgentDetailView>['readiness'] {
  const info = useAgents().data?.find((entry) => entry.agent === agent);
  if (!info) return { status: 'checking' };
  return { status: listedStatus(info), reason: info.reason };
}
const checkedManagement = (
  management: React.ComponentProps<typeof CustomAgentDetailView>['management'],
  checking: boolean,
): React.ComponentProps<typeof CustomAgentDetailView>['management'] =>
  management ? { ...management, busy: management.busy || checking } : undefined;
