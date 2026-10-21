import { newSessionCatalogs } from '@repo/mocks/app';
import {
  composerFastModeConfiguration,
  composerLongListConfiguration,
  composerLongSettingsOptions,
  composerUnlistedEffortConfiguration,
} from '../../../../../mocks/composer-mock';
import type { ComposerConfigurationProps } from './composer-configuration';

// The control declares no callback of its own: the picker's callbacks travel inside the configuration.
interface ConfigurationFixture {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}

// A fixture stays plain data, so choosing an Agent here changes nothing.
const choose = (): void => {};

// Before Send the picker also offers the Agent; an open Session keeps its Agent fixed.
const agentChoices = {
  agents: newSessionCatalogs.bothAvailable,
  onChange: choose,
  onAdd: choose,
};

// An Agent whose effort is set to a value its own catalog does not list.
export const defaultEffortConfiguration = {
  configuration: composerUnlistedEffortConfiguration,
  disabled: false,
} satisfies ConfigurationFixture;

// Enough Agents and models that both lists scroll inside the picker.
export const longListsConfiguration = {
  configuration: composerLongListConfiguration,
  disabled: false,
} satisfies ConfigurationFixture;

// Fast mode on, which the trigger and the picker both say.
export const fastModeConfiguration = {
  configuration: composerFastModeConfiguration(true),
  disabled: false,
} satisfies ConfigurationFixture;

// The Agent's other select options sit in Configure beside its model and effort.
export const otherOptionsConfiguration = {
  configuration: {
    ...composerUnlistedEffortConfiguration,
    configOptions: [
      ...composerUnlistedEffortConfiguration.configOptions,
      ...composerLongSettingsOptions,
    ],
  },
  disabled: false,
} satisfies ConfigurationFixture;

// New Session: the same Drill adds the Agent row above the model.
export const newSessionConfiguration = {
  configuration: { ...composerUnlistedEffortConfiguration, agentChoices },
  disabled: false,
} satisfies ConfigurationFixture;

// The Session opens and takes this device's last choices: the options are still loading.
export const openingConfiguration = {
  configuration: {
    ...composerUnlistedEffortConfiguration,
    configOptions: [],
    opening: true,
    agentChoices,
  },
  disabled: false,
} satisfies ConfigurationFixture;
