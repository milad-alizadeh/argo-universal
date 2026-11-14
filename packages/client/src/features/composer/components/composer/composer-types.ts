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

export interface ComposerProps {
  draft: ComposerDraft;
  promptQueue?: PromptQueueProps;
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
  onDraftChange: (draft: ComposerDraft) => void;
  onAttachImages: () => void;
  onAttachCamera?: () => void;
  onAttachFiles?: () => void;
  onCreateGoal?: () => void;
  onSend: (draft: ComposerDraft) => void;
  onStop?: () => void;
  configuration?: ComposerConfigurationProps;
  status?: ComposerStatusProps;
  placeholder?: string;
  sending?: boolean;
  disabled?: boolean;
  sendable?: boolean;
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
  sendState: 'stop' | 'sending' | 'ready' | 'blocked';
  send: () => void;
}
