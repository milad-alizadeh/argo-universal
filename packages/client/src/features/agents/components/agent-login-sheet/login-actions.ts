import type { AgentLoginSnapshot } from '@repo/contracts';
import type { ButtonDataProps } from '../../../../lib/generic/primitives/buttons/button/button-props';
import { ongoingLogin } from './login-copy';
import type { AgentLoginSheetProps } from './login-props';

type Action = Pick<ButtonDataProps, 'label' | 'onPress'> & { id: string };

const done = (props: AgentLoginSheetProps): Action => ({
  id: 'done',
  label: 'Done',
  onPress: props.onClose,
});

const cancel = (props: AgentLoginSheetProps): Action => ({
  id: 'cancel',
  label: 'Cancel',
  onPress: props.onCancel,
});

const retry = (props: AgentLoginSheetProps): Action => ({
  id: 'retry',
  label: 'Try again',
  onPress: props.onRetry,
});

const retries = new Set<AgentLoginSnapshot['status']>([
  'cancelled',
  'failed',
  'timed-out',
]);

export function loginActions(props: AgentLoginSheetProps): Action[] {
  if (props.disconnected) return [done(props)];
  const snapshot = props.snapshot;

  if (!snapshot) return initialActions(props);

  return snapshotActions(props, snapshot);
}

function snapshotActions(
  props: AgentLoginSheetProps,
  snapshot: AgentLoginSnapshot,
): Action[] {
  if (snapshot.status === 'closing') return [];

  if (snapshot.status === 'choose-method')
    return methodActions(props, snapshot);

  return remainingActions(props, snapshot);
}

function methodActions(
  props: AgentLoginSheetProps,
  snapshot: AgentLoginSnapshot,
): Action[] {
  return [
    ...snapshot.methods.map(({ id, name }) => ({
      id,
      label: name,
      onPress: () => props.onChoose(id),
    })),
    cancel(props),
  ];
}

function remainingActions(
  props: AgentLoginSheetProps,
  snapshot: AgentLoginSnapshot,
): Action[] {
  if (ongoingLogin(snapshot.status)) return activeActions(props, snapshot);

  if (snapshot.status === 'unsupported') return [back(props)];

  return terminalActions(props, snapshot.status);
}

function terminalActions(
  props: AgentLoginSheetProps,
  status: AgentLoginSnapshot['status'],
): Action[] {
  return retries.has(status) ? [retry(props), done(props)] : [done(props)];
}

function activeActions(
  props: AgentLoginSheetProps,
  snapshot: AgentLoginSnapshot,
): Action[] {
  const request = snapshot.request;

  if (!request) return [cancel(props)];

  return browserActions(props, request);
}

function browserActions(
  props: AgentLoginSheetProps,
  request: NonNullable<AgentLoginSnapshot['request']>,
): Action[] {
  const open: Action = {
    id: 'open',
    label: 'Open sign-in page',
    onPress: () => props.onOpenBrowser(request.url),
  };

  return [open, acceptAction(props, request), cancel(props)];
}

export function dismissLogin(props: AgentLoginSheetProps): void {
  if (props.disconnected) return props.onClose();
  dismissConnectedLogin(props);
}

function dismissConnectedLogin(props: AgentLoginSheetProps): void {
  const status = loginStatus(props);

  if (status === 'closing') return;

  if (ongoingLogin(status)) return props.onCancel();
  props.onClose();
}

export const loginStatus = (
  props: AgentLoginSheetProps,
): AgentLoginSnapshot['status'] => props.snapshot?.status ?? 'starting';

function acceptAction(
  props: AgentLoginSheetProps,
  request: NonNullable<AgentLoginSnapshot['request']>,
): Action {
  return {
    id: 'accept',
    label: 'I’ve finished',
    onPress: () => props.onAnswer(request.id, 'accept'),
  };
}

function initialActions(props: AgentLoginSheetProps): Action[] {
  if (props.failure) return [retry(props), done(props)];

  return [cancel(props)];
}

const back = (props: AgentLoginSheetProps): Action => ({
  id: 'back',
  label: 'Back',
  onPress: props.onClose,
});
