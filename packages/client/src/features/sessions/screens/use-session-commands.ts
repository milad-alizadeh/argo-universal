import type { SessionConfigOption } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import {
  type ComposerDraft,
  isRememberedConfiguration,
  rememberSessionConfiguration,
  useAttachmentDraft,
} from '#features/composer';
import type { ClientError } from '#features/connection';
import { useTRPC } from '#features/connection';

type SessionMutation<Name extends 'prompt' | 'cancel' | 'setConfigOption'> =
  ReturnType<
    typeof useMutation<
      inferRouterOutputs<AppRouter>['session'][Name],
      ClientError,
      inferRouterInputs<AppRouter>['session'][Name],
      undefined
    >
  >;
type AttachmentDraft = ReturnType<typeof useAttachmentDraft>;
export type SessionCommands = Omit<
  AttachmentDraft,
  'clearDraft' | 'uploadDraftAsPrompt'
> & {
  promptSession: SessionMutation<'prompt'>;
  cancelTurn: SessionMutation<'cancel'>;
  setConfigOption: SessionMutation<'setConfigOption'>;
  sendDraft: (sent: ComposerDraft) => Promise<void>;
};

interface SessionCommandTarget {
  sessionId: string;
  resumeAfterCommand: () => void;
  agent: string | undefined;
}

type DraftCommands = Omit<SessionCommands, 'cancelTurn' | 'setConfigOption'>;

interface PromptFollowUp {
  clearDraft: () => void;
  resumeAfterCommand: () => void;
}

interface ConfigFollowUp {
  queryClient: QueryClient;
  resumeAfterCommand: () => void;
  agent: string | undefined;
}

interface ConfigurationChange {
  configOptions: SessionConfigOption[];
  configId: string;
}

type ConfigChangeSuccess = (
  changed: Pick<ConfigurationChange, 'configOptions'>,
  input: Pick<ConfigurationChange, 'configId'>,
) => void;

// Draft uploads and successful commands resume a Feed that has closed.
export function useSessionCommands(
  target: SessionCommandTarget,
): SessionCommands {
  return {
    ...useDraftCommands(target),
    cancelTurn: useCancelTurn(target.resumeAfterCommand),
    setConfigOption: useSetConfigOption(target),
  };
}

function useDraftCommands({
  sessionId,
  resumeAfterCommand,
}: SessionCommandTarget): DraftCommands {
  const { clearDraft, uploadDraftAsPrompt, ...draft } = useAttachmentDraft({
    type: 'session',
    sessionId,
  });
  const promptSession = usePromptSession({ clearDraft, resumeAfterCommand });
  const sendDraft = draftSender(sessionId, promptSession, uploadDraftAsPrompt);
  return { ...draft, promptSession, sendDraft };
}

function usePromptSession({
  clearDraft,
  resumeAfterCommand,
}: PromptFollowUp): SessionMutation<'prompt'> {
  const trpc = useTRPC();
  const onSuccess = (): void => {
    clearDraft();
    resumeAfterCommand();
  };
  return useMutation(trpc.session.prompt.mutationOptions({ onSuccess }));
}

function useCancelTurn(onSuccess: () => void): SessionMutation<'cancel'> {
  const trpc = useTRPC();
  return useMutation(trpc.session.cancel.mutationOptions({ onSuccess }));
}

function useSetConfigOption(
  target: SessionCommandTarget,
): SessionMutation<'setConfigOption'> {
  const trpc = useTRPC();
  const onSuccess = afterConfigChange({
    ...target,
    queryClient: useQueryClient(),
  });
  return useMutation(
    trpc.session.setConfigOption.mutationOptions({ onSuccess }),
  );
}

function afterConfigChange(followUp: ConfigFollowUp): ConfigChangeSuccess {
  return ({ configOptions }, { configId }) => {
    followUp.resumeAfterCommand();
    rememberChangedConfiguration(followUp, { configOptions, configId });
  };
}

function isRememberedChange({
  configOptions,
  configId,
}: ConfigurationChange): boolean {
  const changed = configOptions.find((option) => option.configId === configId);
  return changed !== undefined && isRememberedConfiguration(changed);
}

function rememberChangedConfiguration(
  { queryClient, agent }: ConfigFollowUp,
  change: ConfigurationChange,
): void {
  if (agent && isRememberedChange(change))
    rememberSessionConfiguration(queryClient, agent, change.configOptions);
}

function draftSender(
  sessionId: string,
  promptSession: SessionMutation<'prompt'>,
  uploadDraftAsPrompt: AttachmentDraft['uploadDraftAsPrompt'],
): (sent: ComposerDraft) => Promise<void> {
  return async (sent) => {
    promptSession.reset();
    const prompt = await uploadDraftAsPrompt(sent);
    if (prompt?.length) promptSession.mutate({ sessionId, prompt });
  };
}
