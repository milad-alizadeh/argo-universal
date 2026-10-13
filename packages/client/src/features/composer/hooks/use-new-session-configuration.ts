import type { AgentInfo, SessionConfigOption } from '@repo/contracts';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  savedChoicesQuery,
  rememberSessionConfiguration,
} from '../state/configuration-preference-storage';
import {
  draftConfiguration,
  newConfigurationOptions,
  changedSelection,
  type NewSessionConfiguration,
} from '../state/configuration-preferences';
type SwitchValues = Record<string, Record<string, boolean>>;
interface DraftConfigurationState {
  id: string;
  ready: boolean;
  configOptions: SessionConfigOption[];
  client: QueryClient;
  setSwitchValues: Dispatch<SetStateAction<SwitchValues>>;
}
export function useNewSessionConfiguration(
  agent: AgentInfo | undefined,
): NewSessionConfiguration {
  const client = useQueryClient();
  const id = agentId(agent);
  const switches = useDraftSwitches();
  const saved = useQuery({ ...savedChoicesQuery(id), enabled: !!agent });
  return newSessionConfiguration(agent, { ...switches, client, id, saved });
}
function useDraftSwitches(): {
  switchValues: SwitchValues;
  setSwitchValues: DraftConfigurationState['setSwitchValues'];
} {
  const [switchValues, setSwitchValues] = useState<SwitchValues>({});
  return { switchValues, setSwitchValues };
}
interface NewConfigurationInputs extends Pick<
  DraftConfigurationState,
  'client' | 'id' | 'setSwitchValues'
> {
  switchValues: SwitchValues;
  saved: {
    data: Parameters<typeof draftConfiguration>[1] | undefined;
    isSuccess: boolean;
  };
}
function newSessionConfiguration(
  agent: AgentInfo | undefined,
  inputs: NewConfigurationInputs,
): NewSessionConfiguration {
  const remembered = draftConfiguration(
    agent,
    savedPreferences(inputs.saved.data),
  );
  const configOptions = newConfigurationOptions(
    agent,
    remembered,
    inputs.switchValues[inputs.id],
  );
  return configurationResult(configurationState(inputs, configOptions));
}
function configurationResult(
  state: DraftConfigurationState,
): NewSessionConfiguration {
  return {
    configOptions: state.ready ? state.configOptions : [],
    ready: state.ready,
    change: changeConfiguration(state),
  };
}
function agentId(agent: AgentInfo | undefined): string {
  return agent?.agent ?? '';
}
function savedPreferences(
  saved: Parameters<typeof draftConfiguration>[1] | undefined,
): Parameters<typeof draftConfiguration>[1] {
  return saved ?? {};
}
function changeConfiguration(
  state: DraftConfigurationState,
): NewSessionConfiguration['change'] {
  return (configId, value): void => {
    if (!state.ready) return;
    if (typeof value === 'boolean') return changeSwitch(state, configId, value);
    const changed = state.configOptions.map((option) =>
      changedSelection(option, configId, value),
    );
    rememberSessionConfiguration(state.client, state.id, changed);
  };
}
function changeSwitch(
  state: Pick<DraftConfigurationState, 'id' | 'setSwitchValues'>,
  configId: string,
  value: boolean,
): void {
  state.setSwitchValues((previous) => ({
    ...previous,
    [state.id]: { ...previous[state.id], [configId]: value },
  }));
}
function configurationState(
  inputs: NewConfigurationInputs,
  configOptions: SessionConfigOption[],
): DraftConfigurationState {
  return { ...inputs, ready: inputs.saved.isSuccess, configOptions };
}
