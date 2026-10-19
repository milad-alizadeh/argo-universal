import { useEffect, useState } from 'react';
import { PluginDispatcher } from './plugin-dispatcher';
import type { PluginOnEvent } from './plugin-event';

export interface PluginUi {
  send: PluginDispatcher['send'];
}

export function usePluginDispatcher(onEvent: PluginOnEvent): PluginUi {
  const [events] = useState(() => new PluginDispatcher(onEvent));
  useEffect(() => {
    events.setDelivery(onEvent);
  }, [events, onEvent]);
  useEffect(() => (): void => events.close(), [events]);

  return { send: events.send.bind(events) };
}
