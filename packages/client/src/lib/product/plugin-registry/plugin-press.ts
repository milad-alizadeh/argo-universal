import type { Handler, PluginInteraction } from '@repo/contracts/plugins/wire';
import { deliverControl, useControlValue } from './plugin-control-state';
import type { RenderContext } from './plugin-rendering';

export interface PluginPress {
  pending: boolean;
  handler: (
    handler: Handler | undefined,
    interaction?: PluginInteraction,
  ) => (() => void) | undefined;
}

export function usePluginPress(context: RenderContext): PluginPress {
  const state = useControlValue<boolean>(false);

  const handler: PluginPress['handler'] = (
    action,
    interaction = { event: 'onPress' },
  ) =>
    action
      ? () => {
          void state.change(true, () =>
            deliverControl(action, interaction, context),
          );
        }
      : undefined;

  return { pending: state.pending, handler };
}
