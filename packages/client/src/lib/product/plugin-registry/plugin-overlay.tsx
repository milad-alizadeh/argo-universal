import { PluginAlert } from './plugin-alert';
import type { OverlayProps } from './plugin-overlay-types';
import { PluginPanel } from './plugin-panel';

export function PluginOverlay({
  actions,
  renderContent,
}: OverlayProps): React.JSX.Element | null {
  if (!actions.overlay) return null;
  const props = { actions, opened: actions.overlay, renderContent };

  return actions.overlay.action.action === 'alert' ? (
    <PluginAlert key={actions.overlay.id} {...props} />
  ) : (
    <PluginPanel key={actions.overlay.id} {...props} />
  );
}
