import type { RichTextareaProps } from '@repo/kit/primitives/controls/rich-textarea';
import { useEffect, useState } from 'react';
import type { ComposerProps } from '../components/composer/composer-types';

type FollowUpProps = Pick<
  ComposerProps,
  | 'sending'
  | 'draft'
  | 'onDraftChange'
  | 'followUpSuggestion'
  | 'permissionRequest'
  | 'elicitation'
  | 'callout'
>;

type Dismissal = { dismiss: () => void; hidden: boolean };

type InlineSuggestion = RichTextareaProps['inlineSuggestion'];

type FollowUpControls = {
  inlineSuggestion: InlineSuggestion;
  changeDraft: ComposerProps['onDraftChange'];
};

function hasRequest(props: FollowUpProps): boolean {
  return Boolean(props.permissionRequest || props.elicitation || props.callout);
}

function hasDraft(props: FollowUpProps): boolean {
  return props.draft.text.length > 0 || props.draft.attachments.length > 0;
}

function isBlocked(props: FollowUpProps, inactive: boolean): boolean {
  return inactive || hasRequest(props) || hasDraft(props);
}

function isDismissed(
  candidate: ComposerProps['followUpSuggestion'],
  turnId: string | null,
): boolean {
  if (!candidate) return false;

  return candidate.dismissed === true || candidate.turnId === turnId;
}

function useDismissal(
  candidate: ComposerProps['followUpSuggestion'],
  sending: boolean | undefined,
): Dismissal {
  const [turnId, setTurnId] = useState<string | null>(null);

  const disabled = dismissedCandidateTurn(candidate, turnId);

  const nextTurn = dismissalTurn({ sending, turnId, disabled });

  if (nextTurn !== turnId) setTurnId(nextTurn);
  useEffect(() => {
    if (shouldPersistDismissal(candidate, turnId)) dismissCandidate(candidate);
  }, [candidate, turnId]);

  return dismissal(candidate, turnId, setTurnId);
}

function disabledTurn(
  candidate: ComposerProps['followUpSuggestion'],
): string | undefined {
  if (candidate?.enabled !== false) return undefined;

  return candidate.turnId;
}

function dismissCandidate(
  candidate: ComposerProps['followUpSuggestion'],
): void {
  candidate?.onDismiss?.();
}

function dismissal(
  candidate: ComposerProps['followUpSuggestion'],
  turnId: string | null,
  setTurnId: (id: string) => void,
): Dismissal {
  const dismiss = (): void => {
    if (!candidate) {
      setTurnId('');

      return;
    }

    setTurnId(candidate.turnId);
    candidate.onDismiss?.();
  };

  return { dismiss, hidden: isDismissed(candidate, turnId) };
}

type SuggestionControls = {
  dismiss: () => void;
  hidden: boolean;
  changeDraft: ComposerProps['onDraftChange'];
};

function useControls(props: FollowUpProps): SuggestionControls {
  const dismissal = useDismissal(props.followUpSuggestion, props.sending);

  const changeDraft: ComposerProps['onDraftChange'] = (draft) => {
    dismissal.dismiss();
    props.onDraftChange(draft);
  };

  return { ...dismissal, changeDraft };
}

function prediction(
  props: FollowUpProps,
  controls: ReturnType<typeof useControls>,
): InlineSuggestion {
  const candidate = props.followUpSuggestion;

  if (!enabledCandidate(candidate)) return undefined;

  if (!candidate.text) return undefined;

  const text = candidate.text;

  return {
    text,
    onAccept: () => controls.changeDraft({ ...props.draft, text }),
    onDismiss: controls.dismiss,
  };
}

export function useFollowUpSuggestion(
  props: FollowUpProps,
  inactive: boolean,
): FollowUpControls {
  const controls = useControls(props);

  return {
    changeDraft: controls.changeDraft,
    inlineSuggestion:
      controls.hidden || isBlocked(props, inactive)
        ? undefined
        : prediction(props, controls),
  };
}

function enabledCandidate(
  candidate: ComposerProps['followUpSuggestion'],
): candidate is NonNullable<ComposerProps['followUpSuggestion']> {
  return candidate?.enabled === true;
}

function dismissedCandidateTurn(
  candidate: ComposerProps['followUpSuggestion'],
  editedTurn: string | null,
): string | undefined {
  if (candidate && editedTurn === '') return candidate.turnId;

  return disabledTurn(candidate);
}

function shouldPersistDismissal(
  candidate: ComposerProps['followUpSuggestion'],
  turnId: string | null,
): boolean {
  if (!candidate) return false;

  return persistCandidate(candidate, turnId);
}

function persistCandidate(
  candidate: NonNullable<ComposerProps['followUpSuggestion']>,
  turnId: string | null,
): boolean {
  if (candidate.dismissed) return false;

  return candidate.enabled === false || candidate.turnId === turnId;
}

type DismissalState = {
  sending: boolean | undefined;
  turnId: string | null;
  disabled: string | undefined;
};

function dismissalTurn(state: DismissalState): string | null {
  if (state.sending) return null;

  return state.disabled ?? state.turnId;
}
