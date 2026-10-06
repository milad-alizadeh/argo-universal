import type {
  BlobRef,
  SessionConfigOption,
  SessionNewInput,
} from '@repo/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Composer, type ComposerDraft } from '#components/Composer';
import { LoadError } from '#components/LoadError';
import { Screen } from '#components/Screen';
import { StartSessionIn } from '#components/StartSessionIn';
import { pickImages } from '#lib/pick-images';
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
  // The file behind each attached image, by its id in the draft.
  const imageFiles = useRef(new Map<string, Blob>());

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

  const upload = useMutation(trpc.blob.upload.mutationOptions());
  const start = useMutation(
    trpc.session.new.mutationOptions({
      onSuccess: ({ sessionId }) =>
        navigate({ to: 'session', id: sessionId }, { replace: true }),
      // The Server probes an Agent that fails to start, so its availability may have changed.
      onError: () => void agents.refetch(),
    }),
  );

  const resetErrors = () => {
    upload.reset();
    start.reset();
  };

  async function attachImages() {
    const picked = await pickImages();
    for (const { image, file } of picked)
      imageFiles.current.set(image.id, file);
    setDraft((current) => ({
      ...current,
      images: [...current.images, ...picked.map(({ image }) => image)],
    }));
  }

  // Uploads each image, in draft order, for the prompt's image blocks.
  async function uploadImages(sent: ComposerDraft): Promise<BlobRef[]> {
    const references: BlobRef[] = [];
    for (const image of sent.images) {
      const file = imageFiles.current.get(image.id);
      if (!file) throw new Error(`${image.name} is no longer available`);
      const form = new FormData();
      form.append('file', file, image.name);
      references.push(await upload.mutateAsync(form));
    }
    return references;
  }

  async function send(sent: ComposerDraft) {
    if (!project || !agent) return;
    resetErrors();
    let images: BlobRef[];
    try {
      images = await uploadImages(sent);
    } catch {
      return;
    }
    const input: SessionNewInput = {
      projectId: project.id,
      agent: agent.agent,
      checkout: worktree ? { type: 'worktree', baseBranch } : { type: 'main' },
      configOptions: configOptions.map(({ configId, currentValue }) => ({
        configId,
        value: currentValue,
      })),
      prompt: [
        ...(sent.text.trim()
          ? [{ type: 'text' as const, text: sent.text }]
          : []),
        ...images.map((blob) => ({
          type: 'image' as const,
          mimeType: blob.mime,
          blob,
        })),
      ],
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
  let startError: string | undefined;
  if (upload.error)
    startError = `Couldn't upload the image. ${upload.error.message}`;
  if (start.error)
    startError = `Couldn't start the Session. ${start.error.message}`;
  const sending = upload.isPending || start.isPending;
  const error = agent && !agentReady ? agent.installStep : startError;
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
        <View className="items-center px-4 pb-2 wide:px-6">
          <StartSessionIn
            serverName={info.data.name}
            serverConnected={connected}
            projects={projects.data}
            projectId={project?.id ?? ''}
            onProjectChange={(id) => {
              setChosenProjectId(id);
              setNewWorktree(undefined);
              resetErrors();
            }}
            checkout={checkout}
            disabled={sending}
          />
        </View>
        <View className="items-center px-4 pb-4 wide:px-6">
          <Composer
            draft={draft}
            onDraftChange={setDraft}
            onAttachImages={() => void attachImages()}
            onSend={(sent) => void send(sent)}
            placeholder=""
            sending={sending}
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
                resetErrors();
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
