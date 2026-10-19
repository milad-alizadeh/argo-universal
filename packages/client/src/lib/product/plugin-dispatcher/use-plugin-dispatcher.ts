import { useEffect, useState } from 'react';
import { PluginDispatcher } from './plugin-dispatcher';
import type { PluginOnEvent } from './plugin-event';

export type PluginSend = PluginDispatcher['send'];

export function usePluginDispatcher(onEvent: PluginOnEvent): PluginSend {
  const [events] = useState(() => new PluginDispatcher(onEvent));
  useEffect(() => {
    events.setDelivery(onEvent);
  }, [events, onEvent]);
  useEffect(() => (): void => events.close(), [events]);

  return events.send.bind(events);
}
