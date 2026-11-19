import type { SlashCommand } from '@repo/contracts';
import type {
  RichTextareaHandle,
  SuggestionResource,
  SuggestionSource,
} from '@repo/kit/primitives/controls/rich-textarea';
import type { ReactNode, RefCallback } from 'react';
import type {
  ElicitationFormProps,
  PermissionRequestProps,
} from '#features/requests';
import type { ComposerAttachment } from '../composer-attachment-card/composer-attachment-card';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';
import type { ComposerStatusProps } from '../composer-status/composer-status';
import type { PromptQueueProps } from '../prompt-queue/prompt-queue';
import type { WrittenPlanValue } from '../written-plan/written-plan';

export interface ComposerDraft {
  text: string;
  attachments: ComposerAttachment[];
  // The chosen suggestions' resources whose text is still written; left out when there are none.
  resources?: readonly SuggestionResource[];
}

// The mic and speaker buttons of a connected call: what each holds now and what pressing it asks.
export interface ComposerVoiceMutes {
  microphone: boolean;
  speaker: boolean;
  onMicrophone: () => void;
  onSpeaker: () => void;
}

// The call runs in another Session: the pointer that names it and takes the person there.
export interface ComposerVoiceElsewhere {
  kind: 'elsewhere';
  // The Session the call is attached to.
  title: string;
  onOpen: () => void;
}

/*
 * The Composer's voice slot, already resolved by the voice module: the voice button while no call runs and one can
 * start, End while a call connects or runs here, with the mutes once it is connected, or the pointer to a call in
 * another Session. Absent from the props while there is nothing to offer. Text in the draft still wins: Send.
 */
export type ComposerVoice =
  | { kind: 'start'; onStart: () => void }
  | { kind: 'connecting'; onEnd: () => void; edge?: ReactNode }
  | {
      kind: 'connected';
      onEnd: () => void;
      mutes: ComposerVoiceMutes;
      // A drawing of the call along the card's top edge, above the text box; absent while the stage draws it.
      edge?: ReactNode;
    }
  | ComposerVoiceElsewhere;

export type SendState =
  | 'stop'
  | 'sending'
  | 'ready'
  | 'blocked'
  | 'voice'
  | 'connecting'
  | 'end';

export interface ComposerProps {
  draft: ComposerDraft;
  promptQueue?: PromptQueueProps;
  queueEdit?: { id: string; cancel: () => void };
  queueWhileRunning?: boolean;
  followUpSuggestion?: {
    sessionId: string;
    turnId: string;
    text: string | null;
    enabled?: boolean;
    dismissed?: boolean;
    onDismiss?: () => void;
  };
  slashCommands?: readonly SlashCommand[];
  // Sources after the Agent's Slash commands, in the order their results are grouped.
  suggestionSources?: readonly SuggestionSource[];
  permissionRequest?: PermissionRequestProps;
  // An open Elicitation, in the request's tray on a wide window and a sheet on a phone; a Permission request takes its place while one is open.
  elicitation?: ElicitationFormProps;
  // A Session's sign-in or launch callout, in the request's tray; a request takes its place while one is open.
  callout?: ReactNode;
  writtenPlan?: WrittenPlanValue;
  phonePill?: ReactNode;
  onDraftChange: (draft: ComposerDraft) => void;
  onAttachImages: () => void;
  onAttachCamera?: () => void;
  onAttachFiles?: () => void;
  onCreateGoal?: () => void;
  onSend: (draft: ComposerDraft) => void;
  onSteer?: (draft: ComposerDraft) => void;
  onStop?: () => void;
  configuration?: ComposerConfigurationProps;
  status?: ComposerStatusProps;
  placeholder?: string;
  sending?: boolean;
  disabled?: boolean;
  sendable?: boolean;
  // Absent where Voice calls are not offered.
  voice?: ComposerVoice;
  error?: string;
  errorKey?: string;
}

export interface ComposerLayout {
  props: ComposerProps;
  composerId: string;
  // The message field, for choices that write into it.
  field: {
    attach: RefCallback<RichTextareaHandle>;
    insertWord: (word: string) => void;
  };
  wide: boolean;
  inactive: boolean;
  configurationInactive: boolean;
  sendState: SendState;
  // The pointer to a call in another Session, while it takes the primary slot instead of a button.
  callPointer: ComposerVoiceElsewhere | undefined;
  send: () => void;
  modifiedSend: () => void;
}
