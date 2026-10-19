import type { OverlayAction } from '@repo/contracts/plugins/wire';
import type { AlertAction } from '#primitives/overlays/alert';
import type { OpenOverlay, Overlays } from './overlays';

export interface OverlayProps {
  actions: Overlays;
  renderContent: (opened: OpenOverlay) => React.JSX.Element;
}

export interface OpenOverlayProps extends OverlayProps {
  opened: OpenOverlay;
}

export function overlayFinish({
  actions,
  opened,
}: OpenOverlayProps): (confirmed: boolean) => void {
  return (confirmed) => {
    void actions.finish(confirmed, opened.id).catch(() => {});
  };
}

export function overlayOpenChange(
  props: OpenOverlayProps,
): (open: boolean) => void {
  return (open) => {
    if (!open) overlayFinish(props)(false);
  };
}

export function answerControl(
  props: OpenOverlayProps,
  confirmed: boolean,
): AlertAction {
  const event = confirmed ? 'onConfirm' : 'onDismiss';

  return {
    label: answerLabel(props.opened.action, confirmed),
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

const defaultLabel = (confirmed: boolean): string =>
  confirmed ? 'Confirm' : 'Cancel';
