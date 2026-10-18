import type { PluginOnEvent } from './plugin-rendering';
import type { OpenOverlay } from './use-plugin-actions';

export function overlayEvents({ target }: OpenOverlay): PluginOnEvent {
  return (_key, interaction) => {
    if (interaction.event !== 'onAction')
      throw new Error('Overlay handler has no stable reference');

    return target.send(target.key, interaction);
  };
}
