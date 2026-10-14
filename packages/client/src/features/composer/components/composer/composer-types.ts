import type {
  PermissionRequestProps,
  PlanProposalCardProps,
} from '#features/requests';
import type { DroppedFiles } from '../../hooks/use-file-drop';
import type { ComposerAttachment } from '../composer-attachment-card/composer-attachment-card';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';
import type { ComposerStatusProps } from '../composer-status/composer-status';
import type { WrittenPlanValue } from '../written-plan/written-plan';

export interface ComposerDraft {
  text: string;
  attachments: ComposerAttachment[];
}

export interface ComposerProps {
  draft: ComposerDraft;
  planProposal?: PlanProposalCardProps;
  permissionRequest?: PermissionRequestProps;
  writtenPlan?: WrittenPlanValue;
  onDraftChange: (draft: ComposerDraft) => void;
  onAttachImages: () => void;
  onAttachCamera?: () => void;
  onAttachFiles?: () => void;
  onDropFiles?: (dropped: DroppedFiles) => void;
  onSelectSlashCommand?: () => void;
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
  controlsHeight: number;
  setControlsHeight: (height: number) => void;
  wide: boolean;
  inactive: boolean;
  configurationInactive: boolean;
  sendState: 'stop' | 'sending' | 'ready' | 'blocked';
  send: () => void;
}
