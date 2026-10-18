import type { PluginInteraction } from '@repo/contracts/plugins/wire';
import type { PluginActions } from './use-plugin-actions';
import type { PluginControls } from './use-plugin-controls';
import type { PluginUi } from './use-plugin-ui';

export type PluginOnEvent = (
  key: string,
  interaction: PluginInteraction,
) => void | Promise<void>;

export interface RenderContext {
  dispatch: PluginOnEvent;
  key: string;
  ui: PluginUi;
  controls: PluginControls;
  actions: PluginActions;
}
