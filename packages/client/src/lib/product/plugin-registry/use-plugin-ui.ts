import { useEffect, useReducer, useState } from 'react';
import type { PluginOnEvent } from './plugin-registry';
import { PluginUiEvents } from './plugin-ui-events';
import {
  interactionUi,
  reducePluginUi,
  type PluginUiChange,
  type PluginUiState,
} from './plugin-ui-state';

export interface PluginUi {
  state: PluginUiState;
  change: (change: PluginUiChange) => void;
  send: PluginOnEvent;
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
  const [state, change] = useReducer(reducePluginUi, new Map());
  const events = useDelivery(onEvent);

  const send: PluginOnEvent = (key, interaction) => {
    const value = interactionUi(interaction);

    if (value) change({ key, value });

    return events.send(key, interaction);
  };

  return { state, change, send };
}
