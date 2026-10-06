import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Composer, type ComposerDraft } from '#components/Composer';
import { LoadError } from '#components/LoadError';
import { Screen } from '#components/Screen';
import { StartSessionIn } from '#components/StartSessionIn';
import { Text } from '#primitives/text';
import { useConnectionState } from '../connection/context';
import { useNavigate } from '../navigation/context';
import { useWide } from '../navigation/use-wide';
import { useTRPC } from '../trpc/context';

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

const emptyDraft: ComposerDraft = { text: '', images: [] };

function withValue(
  option: SessionConfigOption,
  value: string | boolean | undefined,
): SessionConfigOption {
  if (option.type === 'select' && typeof value === 'string')
    return { ...option, currentValue: value };
  if (option.type === 'boolean' && typeof value === 'boolean')
    return { ...option, currentValue: value };
  return option;
}

// Starts a Session: where it runs, then the Composer; sending replaces this page with the Session.
export function NewSessionScreen({ projectId }: NewSessionScreenProps) {
  const wide = useWide();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const info = useQuery(trpc.system.info.queryOptions());
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useQuery(trpc.agents.list.queryOptions());
  const [chosenProjectId, setChosenProjectId] = useState(projectId);
  const [chosenAgent, setChosenAgent] = useState<string>();
  const [configValues, setConfigValues] = useState<
    Record<string, string | boolean>
  >({});
  const [newWorktree, setNewWorktree] = useState<boolean>();
  const [draft, setDraft] = useState(emptyDraft);

  const project =
    projects.data?.find((entry) => entry.id === chosenProjectId) ??
    projects.data?.[0];
  const branches = useQuery(
    trpc.projects.branches.queryOptions(
      { projectId: project?.id ?? '' },
      { enabled: project?.checkoutChoice.type === 'main' },
    ),
  );
  const agent =
    agents.data?.find((entry) => entry.agent === chosenAgent) ??
    agents.data?.find((entry) => entry.availability === 'available') ??
    agents.data?.[0];
  const configOptions = (agent?.configOptions ?? []).map((option) =>
    withValue(option, configValues[option.configId]),
  );
  const worktree = newWorktree ?? project?.checkoutChoice.type !== 'main';
  const baseBranch =
    project?.checkoutChoice.type === 'worktree'
      ? project.checkoutChoice.baseBranch
      : (branches.data?.currentBranch ?? 'main');

  const start = useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) =>
        navigate({ to: 'session', id: sessionId }, { replace: true }),
      // The Server probes an Agent that fails to start, so its availability may have changed.
      onError: () => void agents.refetch(),
    }),
  );

  function send(sent: ComposerDraft) {
    if (!project || !agent) return;
    const input: SessionNewInput = {
      projectId: project.id,
      agent: agent.agent,
      checkout: worktree ? { type: 'worktree', baseBranch } : { type: 'main' },
      configOptions: configOptions.map(({ configId, currentValue }) => ({
        configId,
        value: currentValue,
      })),
      prompt: [{ type: 'text', text: sent.text }],
    };
    start.mutate(input);
  }

  if (info.isError || projects.isError || agents.isError)
    return (
      <Screen edges={['bottom']} className="justify-center">
        <LoadError
          title="Couldn't load New Session"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={() => {
            void info.refetch();
            void projects.refetch();
            void agents.refetch();
          }}
        />
      </Screen>
    );
  if (!info.data || !projects.data || !agents.data)
    return <Screen edges={['bottom']} />;

  const agentReady = agent?.availability === 'available';
  // Until the current branch loads, a new worktree has no base to start from.
  const branchReady =
    project?.checkoutChoice.type !== 'main' || branches.data !== undefined;
  const error =
    agent && !agentReady
      ? agent.installStep
      : start.error
        ? `Couldn't start the Session. ${start.error.message}`
        : undefined;
  const checkout = {
    branch: baseBranch,
    newWorktree: worktree,
    onNewWorktreeChange: setNewWorktree,
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ minHeight: 0 }}
      >
        <View className="flex-1 items-center justify-center px-6">
          {wide && (
            <Text
              role="heading"
              aria-level={1}
              className="text-center text-base leading-6 font-semibold"
            >
              What should we work on?
            </Text>
          )}
        </View>
        <View className="items-center px-4 pb-2 wide:px-6">
          <StartSessionIn
            serverName={info.data.name}
            serverConnected={connected}
            projects={projects.data}
            projectId={project?.id ?? ''}
            onProjectChange={(id) => {
              setChosenProjectId(id);
              setNewWorktree(undefined);
              start.reset();
            }}
            checkout={checkout}
            disabled={start.isPending}
          />
        </View>
        <View className="items-center px-4 pb-4 wide:px-6">
          <Composer
            draft={draft}
            onDraftChange={setDraft}
            onAttachImages={() => {}}
            onSend={send}
            placeholder=""
            sending={start.isPending}
            disabled={!project || !agentReady || !branchReady}
            sendable={connected}
            error={error}
            phoneCheckout={false}
            configuration={{
              agents: agents.data,
              agent: agent?.agent ?? '',
              configOptions,
              onConfigChange: (configId, value) =>
                setConfigValues((values) => ({ ...values, [configId]: value })),
              onAgentChange: (next) => {
                setChosenAgent(next);
                setConfigValues({});
                start.reset();
              },
              onAgentSetup: (setup) =>
                navigate({ to: 'settings-agent', agent: setup }),
              checkout,
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
