import { errorMessage } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useEffect, useState } from 'react';
import { PluginDispatcher, type ReportFailure } from './plugin-dispatcher';
import type { PluginOnEvent } from './plugin-event';

const reportFailure: ReportFailure = (error): void =>
  showToast({
    title: 'Plugin action failed',
    message: errorMessage(error),
    tone: 'danger',
  });

export type PluginSend = PluginDispatcher['send'];

export function usePluginDispatcher(onEvent: PluginOnEvent): PluginSend {
  const [events] = useState(() => new PluginDispatcher(onEvent, reportFailure));
  useEffect(() => {
    events.setDelivery(onEvent);
  }, [events, onEvent]);
  useEffect(() => (): void => events.close(), [events]);

  return events.send.bind(events);
}
