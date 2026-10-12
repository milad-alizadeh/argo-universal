import type { AgentInfo, SessionConfigOption } from '@repo/contracts';
import {
  configurationChoices,
  configurationEffortChoices,
  useNewSessionConfiguration,
} from '#features/composer';
import type { SessionDefault } from '../state/agent-detail-types';

type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;
interface SessionDefaults {
  defaults: SessionDefault[];
  change: (id: string, value: string) => void;
}

const selectOf = (
  options: SessionConfigOption[],
  category: string,
): SelectOption | undefined =>
  options.find(
    (option): option is SelectOption =>
      option.type === 'select' && option.category === category,
  );

function sessionDefault(
  label: string,
  option: SelectOption | undefined,
  choices: { value: string; name: string }[],
): SessionDefault[] {
  if (!option || choices.length === 0) return [];
  const options = choices.map(({ value, name }) => ({ value, label: name }));
  return [{ id: option.configId, label, value: option.currentValue, options }];
}

const sessionDefaults = (options: SessionConfigOption[]): SessionDefault[] => {
  const model = selectOf(options, 'model');
  const effort = selectOf(options, 'thought_level');
  const mode = selectOf(options, 'mode');
  return [
    ...sessionDefault('Model', model, configurationChoices(model)),
    ...sessionDefault(
      'Effort',
      effort,
      configurationEffortChoices(model, effort),
    ),
    ...sessionDefault('Mode', mode, configurationChoices(mode)),
  ];
};

// The model, effort and mode this device starts new Sessions with for an Agent, as the Composer remembers them.
export function useSessionDefaults(
  agent: AgentInfo | undefined,
): SessionDefaults {
  const { configOptions, change } = useNewSessionConfiguration(agent);
  return { defaults: sessionDefaults(configOptions), change };
}
