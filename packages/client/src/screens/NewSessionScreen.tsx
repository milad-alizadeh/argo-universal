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

// Starts a Session: where it runs, then the Composer; sending replaces this page with the Session.
export function NewSessionScreen({ projectId }: NewSessionScreenProps) {
  const wide = useContentWide();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const serverInfo = useQuery(trpc.system.info.queryOptions());
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useQuery(trpc.agents.list.queryOptions());
  const [chosenProjectId, setChosenProjectId] = useState(projectId);
  const [chosenAgent, setChosenAgent] = useState<string>();
  const [chosenConfigValues, setChosenConfigValues] = useState<
    Record<string, string | boolean>
  >({});
  const [chosenNewWorktree, setChosenNewWorktree] = useState<boolean>();
  const { draft, changeDraft, attachImages, toPrompt, upload } =
    useImageDraft();

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

  const newSession = useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) =>
        navigate({ to: 'session', id: sessionId }, { replace: true }),
      // The Server probes an Agent that fails to start, so its availability may have changed.
      onError: () => void agents.refetch(),
    }),
  );

  // Clears the last Send's upload or start error.
  const clearSendErrors = () => {
    upload.reset();
    newSession.reset();
  };

  async function startSession(sent: ComposerDraft) {
    if (!project || !agent) return;
    clearSendErrors();
    const prompt = await toPrompt(sent);
    if (!prompt) return;
    const input: SessionNewInput = {
      projectId: project.id,
      agent: agent.agent,
      checkout: inNewWorktree
        ? { type: 'worktree', baseBranch }
        : { type: 'main' },
      configOptions: configOptions.map(({ configId, currentValue }) => ({
        configId,
        value: currentValue,
      })),
      prompt,
    };
    newSession.mutate(input);
  }

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
  // Until the current branch loads, a new worktree has no base to start from.
  const baseBranchLoaded =
    project?.checkoutChoice.type !== 'main' || branches.data !== undefined;
  // One Send fails at most one of the two steps.
  let sendError: string | undefined;
  if (newSession.error)
    sendError = `Couldn't start the Session. ${newSession.error.message}`;
  else if (upload.error)
    sendError = `Couldn't upload the image. ${upload.error.message}`;
  const sending = upload.isPending || newSession.isPending;
  const composerError =
    agent && !agentAvailable ? agent.installStep : sendError;
  const checkout = {
    branch: baseBranch,
    newWorktree: inNewWorktree,
    onNewWorktreeChange: setChosenNewWorktree,
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        style={keyboardAvoidingStyle}
      >
        <View className="flex-1 items-center justify-center px-6 pb-10">
          {wide && (
            <View className="w-full max-w-composer gap-2 px-4">
              <Text
                role="heading"
                aria-level={1}
                className="text-[32px] leading-[38px] tracking-[-0.025em] font-semibold text-foreground"
              >
                What should we work on?
              </Text>
            </View>
          )}
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
              setChosenProjectId(id);
              setChosenNewWorktree(undefined);
              clearSendErrors();
            }}
            checkout={checkout}
            disabled={sending}
          />
        </View>
        <View
          className={wide ? 'items-center px-6 pb-4' : 'items-center px-4 pb-4'}
        >
          <Composer
            draft={draft}
            onDraftChange={changeDraft}
            onAttachImages={() => void attachImages()}
            onSend={(sent) => void startSession(sent)}
            placeholder=""
            sending={sending}
            disabled={!project || !agentAvailable || !baseBranchLoaded}
            sendable={connected}
            error={composerError}
            phoneCheckout={false}
            configuration={{
              agents: agents.data,
              agent: agent?.agent ?? '',
              configOptions,
              onConfigChange: (configId, value) =>
                setChosenConfigValues((values) => ({
                  ...values,
                  [configId]: value,
                })),
              onAgentChange: (nextAgent) => {
                setChosenAgent(nextAgent);
                setChosenConfigValues({});
                clearSendErrors();
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
