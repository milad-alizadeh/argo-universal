import { newSessionCatalogs } from '@repo/mocks/app';
import {
  selection,
  currentEffortModel,
  effortChoice,
  highEffortModel,
  modeChoice,
  highEffortLabels,
} from './catalog-selections.test.mocks';
import {
  type PickerCatalog,
  missingAvailableAgentFailure,
} from './composer-test-contract.test.mocks';

export const pickerCatalogs = newSessionCatalogs.bothAvailable.map(
  (agent): PickerCatalog => {
    const models = selection(agent, 'model');
    const modes = selection(agent, 'mode');
    const effort = selection(agent, 'thought_level');
    currentEffortModel(agent, models);
    const highModel = highEffortModel(agent, models);

    return {
      agent,
      models: models.choices,
      currentEffort: effortChoice(agent, effort, effort.current).name,
      highEffortModel: highModel,
      highEffortLevels: highEffortLabels(highModel, effort),
      highEffort: effortChoice(agent, effort, 'high').name,
      planning: modeChoice(agent, modes, 'planning'),
      dangerous: modeChoice(agent, modes, 'dangerous'),
    };
  },
);

if (
  !pickerCatalogs.some((catalog) =>
    catalog.models.some((entry) => entry._meta?.argo?.supportsEffort === false),
  )
)
  throw new Error('Recorded catalog needs a model without effort.');

const [firstCatalog] = pickerCatalogs;

if (!firstCatalog) throw new Error(missingAvailableAgentFailure);

export const firstAgent = firstCatalog.agent;

function secondRecordedAgent(): PickerCatalog['agent'] {
  const agent = pickerCatalogs[1]?.agent;

  if (!agent)
    throw new Error('Recorded catalog needs a second available Agent.');

  return agent;
}

export const secondAgent = secondRecordedAgent();
