import type { OpenOverlay, PluginActions } from './use-plugin-actions';

export interface OverlayProps {
  actions: PluginActions;
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
