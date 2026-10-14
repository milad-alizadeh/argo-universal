import type { InstallTool, MachineTools } from '@repo/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useTRPC } from '#features/connection';
import { onForeground } from '../../../lib/generic/app-foreground';
import type { AgentStatus } from '../state/agent-status';
import {
  missingTool,
  type ToolInstallPresentation,
  type ToolNotice,
} from '../state/missing-tool';

type ToolsQuery = {
  data?: MachineTools;
  isFetching: boolean;
  refetch: () => Promise<{ data?: MachineTools }>;
};

// The tools on the Server's PATH, looked for again whenever the page mounts or the window regains focus.
function useToolsQuery(): ToolsQuery {
  return useQuery({
    ...useTRPC().agents.tools.queryOptions(),
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
}

export function useMachineTools(): MachineTools | undefined {
  return useToolsQuery().data;
}

type ToolMutation = {
  status: 'idle' | 'pending' | 'success' | 'error';
  submittedAt: number;
  variables?: { tool: InstallTool };
  error: { message: string } | null;
};

const failureOf = (install: ToolMutation): string =>
  install.error?.message ?? '';

const noticeOf = (
  install: ToolMutation,
  tool: InstallTool,
): ToolNotice | undefined => {
  const key = `${tool}-${install.submittedAt}`;

  if (install.status === 'success') return { key, tool, result: 'installed' };

  if (install.status !== 'error') return undefined;

  return { key, tool, result: 'failed', failure: failureOf(install) };
};

// How the last Homebrew install ended, kept after the tool is found so its toast still shows.
const toolNotice = (install: ToolMutation): ToolNotice | undefined => {
  const tool = install.variables?.tool;

  return tool ? noticeOf(install, tool) : undefined;
};

type ToolInstall = ToolMutation & {
  isPending: boolean;
  mutate: (input: { tool: InstallTool }) => void;
};

// The tools Homebrew finds after installing replace the cached ones, so the page shows Install at once.
function useInstallTool(): ToolInstall {
  const trpc = useTRPC();
  const cache = useQueryClient();

  return useMutation(
    trpc.agents.installTool.mutationOptions({
      onSuccess: (found) =>
        cache.setQueryData(trpc.agents.tools.queryKey(), found),
    }),
  );
}

const missingToolOf = (status?: AgentStatus): InstallTool | undefined =>
  status ? missingTool(status)?.tool : undefined;

const installer =
  (install: ToolInstall, tool: InstallTool | undefined): (() => void) =>
  () => {
    if (tool) install.mutate({ tool });
  };

type ToolsLookup = Pick<
  ToolInstallPresentation,
  'homebrew' | 'server' | 'rechecking' | 'onRecheck'
>;

// Where the tool would install, whether Homebrew is there, and Recheck; the App coming back looks again too.
function useToolsLookup(server?: string): ToolsLookup {
  const tools = useToolsQuery();
  const { refetch } = tools;

  useEffect(() => onForeground(AppState, () => void refetch()), [refetch]);

  return {
    homebrew: !!tools.data?.brew,
    server,
    rechecking: tools.isFetching,
    onRecheck: () => void refetch(),
  };
}

const installState = (
  install: ToolInstall,
): Pick<ToolInstallPresentation, 'installing' | 'notice'> => ({
  installing: install.isPending,
  notice: toolNotice(install),
});

// Homebrew installs the tool an Agent's status says is missing, after the Alert.
export function useToolInstallation(
  status?: AgentStatus,
  server?: string,
): ToolInstallPresentation {
  const lookup = useToolsLookup(server);
  const [confirming, onConfirmingChange] = useState(false);
  const install = useInstallTool();

  return {
    ...lookup,
    ...installState(install),
    confirming,
    onConfirmingChange,
    onInstall: installer(install, missingToolOf(status)),
  };
}
