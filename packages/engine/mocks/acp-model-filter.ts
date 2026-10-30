import type { AcpModelEvent, AcpModelSnapshot } from './acp-session-model';

const roots = new Map(
  Object.entries({
    'xstate.done.actor.createCheckout': 'creating',
    'xstate.error.actor.createCheckout': 'creating',
    'xstate.done.actor.loadSession': 'loading',
    'xstate.error.actor.loadSession': 'loading',
    'xstate.done.actor.removeCheckout': 'removingCheckout',
    'xstate.error.actor.removeCheckout': 'removingCheckout',
    'xstate.done.actor.undoArchive': 'undoingArchive',
    'xstate.error.actor.undoArchive': 'undoingArchive',
    'xstate.done.actor.discardSession': 'discarding',
    'xstate.error.actor.discardSession': 'discarding',
  } as const),
);

const invoking = new Map(
  Object.entries({
    'xstate.done.actor.saveArchive': 'archiving',
    'xstate.error.actor.saveArchive': 'archiving',
    'xstate.done.actor.openAcp': 'opening',
    'xstate.error.actor.openAcp': 'opening',
    'xstate.done.actor.restoreAcpConfiguration': 'restoring',
    'xstate.error.actor.restoreAcpConfiguration': 'restoring',
    'xstate.done.actor.configureAcp': 'configuring',
    'xstate.error.actor.configureAcp': 'configuring',
    'xstate.done.actor.commitPrompt': 'committing',
    'xstate.error.actor.commitPrompt': 'committing',
    'xstate.done.actor.cancelAcp': { activeTurn: { cancelling: 'sending' } },
    'xstate.error.actor.cancelAcp': { activeTurn: { cancelling: 'sending' } },
    'xstate.done.actor.promptAcp': 'activeTurn',
    'xstate.error.actor.promptAcp': 'activeTurn',
    'xstate.done.actor.publishTurn': 'publishing',
    'xstate.error.actor.publishTurn': 'publishing',
    'xstate.done.actor.closeAcp': 'closing',
    'xstate.error.actor.closeAcp': 'closing',
    'xstate.done.actor.publishInterruptedTurn': 'interrupting',
    'xstate.error.actor.publishInterruptedTurn': 'interrupting',
  } as const),
);

const userEvents = new Set([
  'session.archive',
  'session.unarchive',
  'session.shutdown',
  'session.prompt',
  'session.cancel',
  'session.setConfigOption',
  'session.storageFailing',
  'session.answerPermission',
  'session.answerElicitation',
]);

export const canApplyLifecycleEvent = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent,
): boolean => {
  const root = roots.get(event.type);

  if (root) return snapshot.matches(root);

  return canApplyOpenEvent(snapshot, event);
};

const canApplyOpenEvent = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent,
): boolean => {
  const state = invoking.get(event.type);

  if (state) return snapshot.matches({ open: { acp: state } });

  return canApplyUserEvent(snapshot, event);
};

const canApplyUserEvent = (
  snapshot: AcpModelSnapshot,
  event: AcpModelEvent,
): boolean => {
  if (event.type === 'session.close')
    return snapshot.can({ type: 'session.close' });

  if (isUserEvent(event)) return snapshot.can(event);

  return snapshot.matches({ open: 'acp' });
};

type UserEvent = Extract<
  AcpModelEvent,
  {
    type:
      | 'session.archive'
      | 'session.unarchive'
      | 'session.shutdown'
      | 'session.prompt'
      | 'session.cancel'
      | 'session.setConfigOption'
      | 'session.storageFailing'
      | 'session.answerPermission'
      | 'session.answerElicitation';
  }
>;

const isUserEvent = (event: AcpModelEvent): event is UserEvent =>
  userEvents.has(event.type);
