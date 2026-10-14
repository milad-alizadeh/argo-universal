import type { AgentInstallation } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { agentDetail } from '../state/agent-detail';
import type {
  AgentDetail,
  AgentDetailViewProps,
} from '../state/agent-detail-types';
import { useAgentInstallation } from './use-agent-installation';
import { useAgentManagement } from './use-agent-management';
import { useAgents, useRecheck } from './use-agents';
import { useMachineTools, useToolInstallation } from './use-tool-installation';

type AgentPageProps = {
  agent: string;
  onBack: () => void;
  onSignIn: () => void;
};

type AgentPageView = AgentDetailViewProps | undefined;

function useAgentDetail(agent: string): AgentDetail | undefined {
  const tools = useMachineTools();
  const agents = useAgents();
  const catalog = useQuery(useTRPC().agents.catalog.queryOptions());
  const info = agents.data?.find((entry) => entry.agent === agent);
  const registry = catalog.data?.agents.find(({ id }) => id === agent);

  return agentDetail(info, registry, tools);
}

// Repair installs the release again through the same confirmation as Install.
const repairOf = (
  detail: AgentDetail,
  installation: ReturnType<typeof useAgentInstallation>,
): (() => void) | undefined =>
  detail.status === 'not-found'
    ? () => installation.onConfirmingChange(true)
    : undefined;

export function useAgentPageView(props: AgentPageProps): AgentPageView {
  const detail = useAgentDetail(props.agent);
  const recheck = useRecheck(props.agent);
  const { installation, tool } = useDetailInstallations(props.agent, detail);
  const management = useAgentManagement(props.agent, props.onBack);

  if (!detail) return undefined;

  return {
    ...props,
    agent: installedDetail(detail, installation),
    installation,
    tool,
    ...repairActions(detail, installation, recheck),
    ...managementCallbacks(management),
  };
}

const repairActions = (
  detail: AgentDetail,
  installation: ReturnType<typeof useAgentInstallation>,
  recheck: ReturnType<typeof useRecheck>,
): Pick<AgentDetailViewProps, 'onRecheck' | 'onRepair'> => ({
  onRecheck: recheck.pending ? undefined : recheck.run,
  onRepair: repairOf(detail, installation),
});

// Install, or the tool Install needs first.
function useDetailInstallations(
  agent: string,
  detail?: AgentDetail,
): Pick<AgentDetailViewProps, 'installation' | 'tool'> & {
  installation: ReturnType<typeof useAgentInstallation>;
} {
  const installation = useDetailInstallation(agent, detail);
  const tool = useToolInstallation(detail?.status, installation.server);

  return { installation, tool };
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

  return {
    ...detail,
    version: saved.version,
    ...recoveredUpdate(detail, saved),
  };
}

const recoveredUpdate = (
  detail: AgentDetail,
  saved: Extract<AgentInstallation, { status: 'installed' }>,
): Partial<AgentDetail> => {
  if (detail.status !== 'not-installed') return {};

  if (detail.version === saved.version) return {};

  return { status: 'update', availableVersion: detail.version };
};

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

const initialInstalling = (
  installation: ReturnType<typeof useAgentInstallation>,
): boolean => installation.installing && installation.action !== 'Update';
