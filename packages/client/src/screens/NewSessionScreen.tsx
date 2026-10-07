import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Composer, type ComposerDraft } from '#components/Composer';
import { LoadError } from '#components/LoadError';
import { keyboardAvoidingStyle, Screen } from '#components/Screen';
import { StartSessionIn } from '#components/StartSessionIn';
import { Text } from '#primitives/text';
import { useContentWide } from '../components/ContentLayout';
import { useConnectionState } from '../connection/context';
import { useImageDraft } from '../lib/use-image-draft';
import { useNavigate } from '../navigation/context';
import { useTRPC } from '../trpc/context';

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
function useSessionChoices(projectId: string | undefined) {
  const trpc = useTRPC();
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useQuery(trpc.agents.list.queryOptions());
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
    // Until the current branch loads, a new worktree has no base to start from.
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
      setChosenConfigValues((values) => ({ ...values, [configId]: value })),
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
function useStartSession(onStartFailed: () => void) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { draft, changeDraft, attachImages, uploadDraftAsPrompt, imageUpload } =
    useImageDraft();
  const newSession = useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) =>
        navigate({ to: 'session', id: sessionId }, { replace: true }),
      onError: onStartFailed,
    }),
  );

  // Clears the last Send's upload or start error.
  function clearSendErrors() {
    imageUpload.reset();
    newSession.reset();
  }

  async function startSession(sent: ComposerDraft, settings: SessionSettings) {
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
    sendError: sendErrorMessage(newSession.error, imageUpload.error),
  };
}

function NewSessionHeading() {
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
export function NewSessionScreen({ projectId }: NewSessionScreenProps) {
  const wide = useContentWide();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const serverInfo = useQuery(trpc.system.info.queryOptions());
  const choices = useSessionChoices(projectId);
  const { projects, agents, project, agent } = choices;
  // The Server probes an Agent that fails to start, so its availability may have changed.
  const send = useStartSession(() => void agents.refetch());

  if (serverInfo.isError || projects.isError || agents.isError)
    return (
      <Screen edges={['bottom']} className="justify-center">
        <LoadError
          title="Couldn't load New Session"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={() => {
            void serverInfo.refetch();
            void projects.refetch();
            void agents.refetch();
          }}
        />
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
            phoneCheckout={false}
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
              checkout,
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
