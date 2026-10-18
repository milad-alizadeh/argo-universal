import { textForApp } from '@repo/contracts/plugins/kit';
import type { OverlayAction } from '@repo/contracts/plugins/wire';
import { Alert, type AlertAction } from '#primitives/overlays/alert';
import { overlayFinish, type OpenOverlayProps } from './plugin-overlay-types';

export function PluginAlert(props: OpenOverlayProps): React.JSX.Element {
  const action = props.opened.action;
  const actions = [answer(props, false), answer(props, true)];

  return (
    <Alert
      open
      title={action.title}
      message={alertText(action)}
      actions={actions}
      onOpenChange={alertOpenChange(props)}
    />
  );
}

function answer(props: OpenOverlayProps, confirmed: boolean): AlertAction {
  const action = props.opened.action;
  const event = confirmed ? 'onConfirm' : 'onDismiss';

  return {
    label: answerLabel(action, confirmed),
    cancel: !confirmed,
    loading: props.actions.pending === event,
    disabled: props.actions.pending !== null,
    onPress: () => overlayFinish(props)(confirmed),
  };
}

function answerLabel(action: OverlayAction, confirmed: boolean): string {
  const label = confirmed ? action.confirmLabel : action.cancelLabel;

  return label ?? defaultLabel(confirmed);
}

function defaultLabel(confirmed: boolean): string {
  return confirmed ? 'Confirm' : 'Cancel';
}

function alertOpenChange(props: OpenOverlayProps): (open: boolean) => void {
  return (open) => {
    if (!open) queueMicrotask(() => overlayFinish(props)(false));
  };
}

function alertText(action: OverlayAction): string {
  const parsed = textForApp.safeParse(action.content.props);

  return parsed.success ? String(parsed.data.children ?? '') : '';
}
