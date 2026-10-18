import { useEffect, useState, useCallback } from 'react';
import { PluginDispatcher } from './plugin-dispatcher';
import type { PluginOnEvent } from './plugin-event';

export interface PluginUi {
  send: PluginDispatcher['send'];
  dispatch: PluginOnEvent;
  flush: () => Promise<void>;
}

function useDelivery(send: PluginOnEvent): PluginDispatcher {
  const [events] = useState(() => new PluginDispatcher(send));
  useEffect(() => {
    events.setDelivery(send);
  }, [events, send]);
  useEffect(() => (): void => events.close(), [events]);

  return events;
}

export function usePluginDispatcher(onEvent: PluginOnEvent): PluginUi {
  const events = useDelivery(onEvent);
  const flush = useCallback(() => events.flushPending(), [events]);

  return {
    send: events.send.bind(events),
    dispatch: events.dispatch.bind(events),
    flush,
  };
}
