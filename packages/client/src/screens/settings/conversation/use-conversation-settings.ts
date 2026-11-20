import type { ConversationSettings } from '@repo/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useConnectionState,
  useTRPC,
  type ServerMutation,
  type TRPC,
} from '#features/connection';
import { useVoicePreview } from '#features/conversation';
import {
  useCustomVoiceChanges,
  type CustomVoiceChanges,
} from './use-custom-voice-changes';
import type {
  ConversationDetailViewProps,
  ConversationSettingsLoad,
} from './conversation-detail-view-props';
import { controlsOf } from './conversation-settings-controls';

type Controls = Omit<
  ConversationDetailViewProps,
  'onBack' | 'devices' | 'onDevicesChange' | 'adjustsGain'
>;

interface SettingsQuery {
  data?: ConversationSettings;
  isError: boolean;
  refetch: () => void;
}

const settledState = (query: SettingsQuery): ConversationSettingsLoad =>
  query.data
    ? { status: 'loaded', settings: query.data }
    : { status: query.isError ? 'error' : 'loading' };

const loadState = (
  connected: boolean,
  query: SettingsQuery,
): ConversationSettingsLoad =>
  connected ? settledState(query) : { status: 'disconnected' };

type SettingsAnswer = { onSuccess: (settings: ConversationSettings) => void };

// What the Server answers to a change is the page's new state.
function useKeepAnswer(): SettingsAnswer {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return {
    onSuccess: (settings) =>
      cache.setQueryData(trpc.conversation.getSettings.queryKey(), settings),
  };
}

// The changes the Server answers with the whole settings.
interface SettingsChanges {
  change: ServerMutation<TRPC['conversation']['setSettings']>;
  instructions: ServerMutation<TRPC['conversation']['setInstructions']>;
  options: ServerMutation<TRPC['conversation']['setOptions']>;
}

function useSettingsChanges(): SettingsChanges {
  const { conversation } = useTRPC();
  const keep = useKeepAnswer();

  return {
    change: useMutation(conversation.setSettings.mutationOptions(keep)),
    instructions: useMutation(conversation.setInstructions.mutationOptions(keep)),
    options: useMutation(conversation.setOptions.mutationOptions(keep)),
  };
}

// The first failure of a settings change, said under the page.
const errorOf = (changes: SettingsChanges): string | undefined =>
  [changes.change, changes.instructions, changes.options].find(
    (mutation) => mutation.error !== null,
  )?.error?.message;

type Asked = Omit<Parameters<typeof controlsOf>[0], 'preview' | 'retry'>;

// What the page's controls ask of the Server.
const askedOf = (
  settings: SettingsChanges,
  custom: CustomVoiceChanges,
): Asked => ({
  change: (changed) => settings.change.mutate(changed),
  setInstructions: (text) =>
    settings.instructions.mutate({ instructions: text }),
  setCallOptions: (changed) => settings.options.mutate(changed),
  saveCustomVoice: custom.save,
  deleteCustomVoice: custom.remove,
});

// The custom voice form as the page shows it; saving and deleting reach the page through its controls.
const editorOf = (
  custom: CustomVoiceChanges,
): Pick<CustomVoiceChanges, 'editor' | 'editorError' | 'onEditorChange'> => ({
  editor: custom.editor,
  editorError: custom.editorError,
  onEditorChange: custom.onEditorChange,
});

// What the page shows besides its controls: the settings, a change in flight or failed, and the custom voice form.
const shownOf = (
  load: ReturnType<typeof loadState>,
  settings: SettingsChanges,
  custom: CustomVoiceChanges,
): Omit<Controls, keyof ReturnType<typeof controlsOf>> => ({
  voice: load,
  saving: settings.change.isPending,
  error: errorOf(settings),
  ...editorOf(custom),
});

export function useConversationSettings(): Controls {
  const query = useQuery(useTRPC().conversation.getSettings.queryOptions());
  const settings = useSettingsChanges();
  const pick = (voice: string): void => settings.change.mutate({ voice });
  const custom = useCustomVoiceChanges(pick);
  const preview = useVoicePreview();
  const load = loadState(useConnectionState() === 'open', query);
  const retry = (): void => void query.refetch();

  return {
    ...shownOf(load, settings, custom),
    ...controlsOf({ ...askedOf(settings, custom), preview, retry }),
  };
}
