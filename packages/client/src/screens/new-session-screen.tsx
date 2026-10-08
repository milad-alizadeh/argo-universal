import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import type { AppRouter } from '@repo/server/router';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Composer, type ComposerDraft } from '#components/composer';
import { LoadError } from '#components/load-error';
import { keyboardAvoidingStyle, Screen } from '#components/screen';
import { StartSessionIn } from '#components/start-session-in';
import { Text } from '#primitives/text';
import { useContentWide } from '../components/content-layout';
import { useConnectionState } from '../connection/context';
import { useNavigate } from '../navigation/context';
import type { ClientError } from '../trpc/context';
import { useTRPC } from '../trpc/context';
import { useAgents } from '../trpc/use-agents';
import { useImageDraft } from './use-image-draft';

type ProjectsQuery = ReturnType<
  typeof useQuery<
    inferRouterOutputs<AppRouter>['projects']['list'],
    ClientError
  >
>;
interface SessionChoices {
  projects: ProjectsQuery;
  agents: ReturnType<typeof useAgents>;
  project: NonNullable<ProjectsQuery['data']>[number] | undefined;
  agent: NonNullable<ReturnType<typeof useAgents>['data']>[number] | undefined;
  configOptions: SessionConfigOption[];
  inNewWorktree: boolean;
  baseBranch: string;
  baseBranchLoaded: boolean;
  settings: SessionSettings | undefined;
  chooseProject: (id: string) => void;
  chooseAgent: (agent: string) => void;
  chooseConfigValue: (configId: string, value: string | boolean) => void;
  chooseNewWorktree: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

// What a new Session starts with, besides its prompt.
type SessionSettings = Omit<SessionNewInput, 'prompt'>;

// The option with the reader's choice as its current value, when the choice fits its type.
function withChosenValue(
  option: SessionConfigOption,
  chosen: string | boolean | undefined,
): SessionConfigOption {
  if (option.type === 'select' && typeof chosen === 'string')
    return { ...option, currentValue: chosen };
  if (option.type === 'boolean' && typeof chosen === 'boolean')
    return { ...option, currentValue: chosen };
  return option;
}

// The reader's choices of where and how the Session runs, over the Project's and Agents' defaults.
function useSessionChoices(projectId: string | undefined): SessionChoices {
  const trpc = useTRPC();
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useAgents();
  const [chosenProjectId, setChosenProjectId] = useState(projectId);
  const [chosenAgent, setChosenAgent] = useState<string>();
  const [chosenConfigValues, setChosenConfigValues] = useState<
    Record<string, string | boolean>
  >({});
  const [chosenNewWorktree, setChosenNewWorktree] = useState<boolean>();

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
    withChosenValue(option, chosenConfigValues[option.configId]),
  );
  const inNewWorktree =
    chosenNewWorktree ?? project?.checkoutChoice.type !== 'main';
  const baseBranch =
    project?.checkoutChoice.type === 'worktree'
      ? project.checkoutChoice.baseBranch
      : (branches.data?.currentBranch ?? 'main');

  const settings: SessionSettings | undefined =
    project && agent
      ? {
          projectId: project.id,
          agent: agent.agent,
          checkout: inNewWorktree
            ? { type: 'worktree', baseBranch }
            : { type: 'main' },
          configOptions: configOptions.map(({ configId, currentValue }) => ({
            configId,
            value: currentValue,
          })),
        }
      : undefined;

  return {
    projects,
    agents,
    project,
    agent,
    configOptions,
    inNewWorktree,
    baseBranch,
    baseBranchLoaded:
      project?.checkoutChoice.type !== 'main' || branches.data !== undefined,
    settings,
    // Another Project starts from its own checkout default.
    chooseProject: (id: string) => {
      setChosenProjectId(id);
      setChosenNewWorktree(undefined);
    },
    // Another Agent starts from its own options.
    chooseAgent: (nextAgent: string) => {
      setChosenAgent(nextAgent);
      setChosenConfigValues({});
    },
    chooseConfigValue: (configId: string, value: string | boolean) =>
      setChosenConfigValues((values) => {
        const next = { ...values, [configId]: value };
        const option = configOptions.find(
          (entry) => entry.configId === configId,
        );
        if (option?.category !== 'model' || option.type !== 'select')
          return next;
        const levels = option.options
          .flatMap((entry) => ('groupId' in entry ? entry.options : [entry]))
          .find((choice) => choice.value === value)?._meta
          ?.argo?.supportedEffortLevels;
        const effort = configOptions.find(
          (entry) =>
            entry.category === 'thought_level' && entry.type === 'select',
        );
        if (
          effort?.type === 'select' &&
          levels &&
          !levels.includes(effort.currentValue)
        )
          delete next[effort.configId];
        return next;
      }),
    chooseNewWorktree: setChosenNewWorktree,
  };
}

// One Send fails at most one of its two steps.
function sendErrorMessage(
  startError: { message: string } | null,
  uploadError: { message: string } | null,
): string | undefined {
  if (startError) return `Couldn't start the Session. ${startError.message}`;
  if (uploadError) return `Couldn't upload the image. ${uploadError.message}`;
  return undefined;
}

// The Composer's draft, and the Send that uploads its images, starts the Session, and opens it in this page's place.
function useStartSession(onStartFailed: () => void): Pick<
  ReturnType<typeof useImageDraft>,
  'draft' | 'changeDraft' | 'attachImages'
> & {
  startSession: (
    sent: ComposerDraft,
    settings: SessionSettings,
  ) => Promise<void>;
  clearSendErrors: () => void;
  sending: boolean;
  sendError: string | undefined;
} {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const {
    draft,
    changeDraft,
    attachImages,
    uploadDraftAsPrompt,
    imageUpload,
    imageSelectionError,
  } = useImageDraft();
  const newSession = useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) =>
        navigate({ to: 'session', id: sessionId }, { replace: true }),
      onError: onStartFailed,
    }),
  );

  // Clears the last Send's upload or start error.
  function clearSendErrors(): void {
    imageUpload.reset();
    newSession.reset();
  }

  async function startSession(
    sent: ComposerDraft,
    settings: SessionSettings,
  ): Promise<void> {
    clearSendErrors();
    const prompt = await uploadDraftAsPrompt(sent);
    if (prompt) newSession.mutate({ ...settings, prompt });
  }

  return {
    draft,
    changeDraft,
    attachImages,
    startSession,
    clearSendErrors,
    sending: imageUpload.isPending || newSession.isPending,
    sendError:
      imageSelectionError ??
      sendErrorMessage(newSession.error, imageUpload.error),
  };
}

function NewSessionHeading(): React.JSX.Element {
  return (
    <View className="w-full max-w-composer gap-2 px-4">
      <Text
        role="heading"
        aria-level={1}
        className="text-[32px] leading-[38px] tracking-[-0.025em] font-semibold text-foreground"
      >
        What should we work on?
      </Text>
    </View>
  );
}

// Starts a Session: where it runs, then the Composer; sending replaces this page with the Session.
export function NewSessionScreen({
  projectId,
}: NewSessionScreenProps): React.JSX.Element {
  const wide = useContentWide();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const serverInfo = useQuery(trpc.system.info.queryOptions());
  const choices = useSessionChoices(projectId);
  const { projects, agents, project, agent } = choices;
  const send = useStartSession(() => void agents.refetch());

  if (serverInfo.isError || projects.isError || agents.isError)
    return (
      <Screen edges={['bottom']}>
        <View className="flex-1 justify-center">
          <LoadError
            title="Couldn't load New Session"
            description="The Server didn't respond. Check that it's running, then retry."
            onRetry={() => {
              void serverInfo.refetch();
              void projects.refetch();
              void agents.refetch();
            }}
          />
        </View>
      </Screen>
    );
  if (!serverInfo.data || !projects.data || !agents.data)
    return <Screen edges={['bottom']} />;

  const agentAvailable = agent?.availability === 'available';
  const checkout = {
    branch: choices.baseBranch,
    newWorktree: choices.inNewWorktree,
    onNewWorktreeChange: choices.chooseNewWorktree,
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        style={keyboardAvoidingStyle}
      >
        <View className="flex-1 items-center justify-center px-6 pb-10">
          {wide && <NewSessionHeading />}
        </View>
        <View
          className={wide ? 'items-center px-6 pb-2' : 'items-center px-4 pb-2'}
        >
          <StartSessionIn
            serverName={serverInfo.data.name}
            serverConnected={connected}
            projects={projects.data}
            projectId={project?.id ?? ''}
            onProjectChange={(id) => {
              choices.chooseProject(id);
              send.clearSendErrors();
            }}
            checkout={checkout}
            disabled={send.sending}
          />
        </View>
        <View
          className={wide ? 'items-center px-6 pb-4' : 'items-center px-4 pb-4'}
        >
          <Composer
            draft={send.draft}
            onDraftChange={send.changeDraft}
            onAttachImages={() => void send.attachImages()}
            onSend={(sent) => {
              if (choices.settings)
                void send.startSession(sent, choices.settings);
            }}
            placeholder=""
            sending={send.sending}
            disabled={!project || !agentAvailable || !choices.baseBranchLoaded}
            sendable={connected}
            error={
              agent && !agentAvailable ? agent.installStep : send.sendError
            }
            configuration={{
              agents: agents.data,
              agent: agent?.agent ?? '',
              configOptions: choices.configOptions,
              onConfigChange: choices.chooseConfigValue,
              onAgentChange: (nextAgent) => {
                choices.chooseAgent(nextAgent);
                send.clearSendErrors();
              },
              onAgentSetup: (setup) =>
                navigate({ to: 'settings-agent', agent: setup }),
              onAgentRetry: agents.retry,
              checkout,
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
