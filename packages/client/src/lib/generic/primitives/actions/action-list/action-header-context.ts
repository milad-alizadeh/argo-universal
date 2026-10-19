import { createContext, use, useEffect } from 'react';
import { orderedGroups, type ActionGroup } from './action-declarations';

interface HeaderRegistration {
  groups: ActionGroup[];
  label: string;
}

type HeaderSink = (id: string, registration: HeaderRegistration) => () => void;

export const ActionListHeaderContext = createContext<HeaderSink | undefined>(
  undefined,
);

interface HeaderInput {
  id: string;
  groups: ActionGroup[];
  label?: string;
  context: boolean;
}

export function useHeaderRegistration(input: HeaderInput): boolean {
  const sink = use(ActionListHeaderContext);
  const enabled = Boolean(sink) && !input.context;
  useHeaderSink(sink, input, enabled);

  return enabled;
}

function useHeaderSink(
  sink: HeaderSink | undefined,
  input: HeaderInput,
  enabled: boolean,
): void {
  const label = input.label ?? 'More actions';
  useEffect(() => {
    if (!enabled || !sink) return;

    return sink(input.id, { groups: orderedGroups(input.groups), label });
  }, [enabled, sink, input.id, input.groups, label]);
}
