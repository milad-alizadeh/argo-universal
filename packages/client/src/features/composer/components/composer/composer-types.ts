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

// Where the Voice call is, seen from this Session's Composer: none, starting or running here, or running in another Session.
export type ComposerVoiceCall =
  | 'none'
  | 'connecting'
  | 'connected'
  | 'elsewhere';

// The mic and speaker buttons of a connected call: what each holds now and what pressing it asks.
export interface ComposerVoiceMutes {
  microphone: boolean;
  speaker: boolean;
  onMicrophone: () => void;
  onSpeaker: () => void;
}

// Where a call in another Session is, for the pointer that takes the person there.
export interface ComposerVoiceElsewhere {
  // The Session the call is attached to.
  title: string;
  onOpen: () => void;
}

export interface ComposerVoice {
  // Whether a Voice provider can start a call now.
  usable: boolean;
  call: ComposerVoiceCall;
  onStart: () => void;
  onEnd: () => void;
  // Present while a call is connected here.
  mutes?: ComposerVoiceMutes;
  // Present while the call runs in another Session.
  elsewhere?: ComposerVoiceElsewhere;
}

export type SendState =
  | 'stop'
  | 'sending'
  | 'ready'
  | 'blocked'
  | 'voice'
  | 'connecting'
  | 'end'
  | 'elsewhere';

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
  send: () => void;
  modifiedSend: () => void;
}
