import type { SessionConfigOption } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import {
  isRememberedConfiguration,
  rememberSessionConfiguration,
} from '#features/composer';
import { type ClientError, useTRPC } from '#features/connection';

type SetConfigOptionInput =
  inferRouterInputs<AppRouter>['session']['setConfigOption'];

export type SetConfigOptionMutation = ReturnType<
  typeof useMutation<
    inferRouterOutputs<AppRouter>['session']['setConfigOption'],
    ClientError,
    SetConfigOptionInput,
    undefined
  >
>;

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

const isRememberedChoice = (
  configOptions: SessionConfigOption[],
  configId: string,
): boolean => {
  const changed = configOptions.find((option) => option.configId === configId);

  return changed !== undefined && isRememberedConfiguration(changed);
};

// After a change the caller hears of it; a model, effort or mode the reader picks is remembered for the Agent's next Session.
function useConfigChanged(
  agent: string | undefined,
  onChanged: () => void,
): (
  output: { configOptions: SessionConfigOption[] },
  input: SetConfigOptionInput,
) => void {
  const queryClient = useQueryClient();

  return ({ configOptions }, { configId }) => {
    onChanged();

    if (agent && isRememberedChoice(configOptions, configId))
      rememberSessionConfiguration(queryClient, agent, configOptions);
  };
}

// Changes one of a Session's options.
export function useSessionConfigChange(
  sessionId: string,
  agent: string | undefined,
  onChanged: () => void,
): SessionConfigChange {
  const trpc = useTRPC();
  const onSuccess = useConfigChanged(agent, onChanged);

  const setConfigOption = useMutation(
    trpc.session.setConfigOption.mutationOptions({ onSuccess }),
  );

  const change = (configId: string, value: string | boolean): void =>
    setConfigOption.mutate(setConfigInput(sessionId, configId, value));

  return { setConfigOption, change };
}
