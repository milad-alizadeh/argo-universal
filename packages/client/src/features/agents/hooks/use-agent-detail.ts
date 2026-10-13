import type { AgentInfo, AgentInstallation } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { agentDetail } from '../state/agent-detail';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../state/agent-detail-types';
import { useAgentInstallation } from './use-agent-installation';
import { useAgentManagement } from './use-agent-management';
import { useAgents } from './use-agents';
import { useSessionDefaults } from './use-session-defaults';
type AgentPageProps = {
  agent: string;
  onBack: () => void;
  onSignIn: () => void;
};
type AgentPageView = AgentDetailViewProps | undefined;
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

export function useAgentPageView(props: AgentPageProps): AgentPageView {
  const { info, detail, retry } = useAgentDetail(props.agent);
  const defaults = useDetailDefaults(info);
  const installation = useDetailInstallation(props.agent, detail);
  const management = useAgentManagement(props.agent, props.onBack);
  if (!detail) return undefined;
  return {
    ...props,
    agent: installedDetail(detail, installation),
    installation,
    ...defaults,
    onCheckAgain: retry,
    ...managementCallbacks(management),
  };
}
function useDetailInstallation(
  agent: string,
  detail?: AgentDetail,
): ReturnType<typeof useAgentInstallation> {
  return useAgentInstallation(
    agent,
    detailVersion(detail),
    detailAction(detail),
  );
}
const detailAction = (detail?: AgentDetail): 'Install' | 'Update' =>
  detail?.status === 'update' ? 'Update' : 'Install';

function installedDetail(
  detail: AgentDetail,
  installation: ReturnType<typeof useAgentInstallation>,
): AgentDetail {
  if (initialInstalling(installation))
    return { ...detail, status: 'not-installed' };
  return withInstallation(detail, installation.status?.installation);
}
function withInstallation(
  detail: AgentDetail,
  saved: AgentInstallation | undefined,
): AgentDetail {
  if (saved?.status !== 'installed') return detail;
  return { ...detail, version: saved.version };
}

const detailVersion = (detail?: AgentDetail): string =>
  detail ? availableVersion(detail) : '';
const availableVersion = (detail: AgentDetail): string =>
  detail.availableVersion ?? detail.version ?? '';

const managementCallbacks = (
  management: AgentDetailViewProps['management'],
): Pick<AgentDetailViewProps, 'management' | 'onRemove'> => ({
  management,
  onRemove: management?.onRemove,
});
function useDetailDefaults(
  info: AgentInfo | undefined,
): Pick<AgentDetailViewProps, 'defaults' | 'onDefaultChange'> {
  const { defaults, change } = useSessionDefaults(info);
  return { defaults, onDefaultChange: change };
}

const initialInstalling = (
  installation: ReturnType<typeof useAgentInstallation>,
): boolean =>
  installation.phase === 'installing' && installation.action !== 'Update';
