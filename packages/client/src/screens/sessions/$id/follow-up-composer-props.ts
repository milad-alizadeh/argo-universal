import type { ComposerProps } from '#features/composer';
import type { OpenSession } from './session-composer-props';

function sending(open: OpenSession): boolean {
  return open.commands.uploading || open.commands.promptSession.isPending;
}

function hidesFollowUp(open: OpenSession): boolean {
  return !open.connected || open.snapshot.state !== 'idle' || sending(open);
}

export function followUpProps(
  open: OpenSession,
): ComposerProps['followUpSuggestion'] {
  const followUp = open.snapshot.followUpSuggestion;

  if (!followUp) return undefined;

  return {
    ...followUp,
    sessionId: open.sessionId,
    enabled: open.commands.followUpSuggestions,
    dismissed: open.commands.dismissedFollowUpTurnId === followUp.turnId,
    onDismiss: () => open.commands.dismissFollowUp?.(followUp.turnId),
    text: hidesFollowUp(open) ? null : followUp.text,
  };
}
