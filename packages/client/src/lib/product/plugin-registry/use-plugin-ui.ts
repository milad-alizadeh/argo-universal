import { useEffect, useState, useCallback } from 'react';
import type { PluginOnEvent } from './plugin-registry';
import { PluginUiEvents } from './plugin-ui-events';

export interface PluginUi {
  send: (
    key: string,
    interaction: Parameters<PluginOnEvent>[1],
    throttleMs?: number,
  ) => void | Promise<void>;
  flush: () => Promise<void>;
}

function useDelivery(send: PluginOnEvent): PluginUiEvents {
  const [events] = useState(() => new PluginUiEvents(send));
  useEffect(() => {
    events.setDelivery(send);
  }, [events, send]);
  useEffect(() => (): void => events.close(), [events]);

  return events;
}

export function usePluginUi(onEvent: PluginOnEvent): PluginUi {
  const events = useDelivery(onEvent);
  const flush = useCallback(() => events.flushPending(), [events]);

  const send: PluginUi['send'] = (key, interaction, throttleMs) => {
    return events.send(key, interaction, throttleMs);
  };

  return { send, flush };
}
