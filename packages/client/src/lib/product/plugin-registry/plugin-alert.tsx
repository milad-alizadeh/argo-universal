import { textForApp } from '@repo/contracts/plugins/kit';
import type { OverlayAction } from '@repo/contracts/plugins/wire';
import { Alert } from '#primitives/overlays/alert';
import {
  answerControl,
  overlayFinish,
  type OpenOverlayProps,
} from './plugin-overlay-types';

export function PluginAlert(props: OpenOverlayProps): React.JSX.Element {
  const { title } = props.opened.action;
  const message = alertText(props.opened.action);
  const actions = [answerControl(props, false), answerControl(props, true)];
  const onOpenChange = alertOpenChange(props);
  const control = { open: true, title, message, actions, onOpenChange };

  return <Alert {...control} />;
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
