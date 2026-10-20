import { useMutation } from '@tanstack/react-query';
import type { inferInput } from '@trpc/tanstack-react-query';
import { type ServerMutation, type TRPC, useTRPC } from '#features/connection';

type SetConfigOption = TRPC['session']['setConfigOption'];

type SetConfigOptionInput = inferInput<SetConfigOption>;

type SetConfigOptionMutation = ServerMutation<SetConfigOption>;

export interface SessionConfigChange {
  setConfigOption: SetConfigOptionMutation;
  change: (configId: string, value: string | boolean) => void;
}

const setConfigInput = (
  sessionId: string,
  configId: string,
  value: string | boolean,
): SetConfigOptionInput =>
  typeof value === 'boolean'
    ? { sessionId, configId, type: 'boolean', value }
    : { sessionId, configId, type: 'id', value };

// Changes one of a Session's options.
export function useSessionConfigChange(
  sessionId: string,
  onChanged: () => void,
): SessionConfigChange {
  const trpc = useTRPC();

  const setConfigOption = useMutation(
    trpc.session.setConfigOption.mutationOptions({ onSuccess: onChanged }),
  );

  const change = (configId: string, value: string | boolean): void =>
    setConfigOption.mutate(setConfigInput(sessionId, configId, value));

  return { setConfigOption, change };
}
