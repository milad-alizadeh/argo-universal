import type {
  PromptRequest,
  SessionConfigOption,
  SetSessionConfigOptionRequest,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';

const selected = new Map([
  ['model', 'small'],
  ['effort', 'high'],
  ['mode', 'plan'],
]);

const appliedConfiguration: SessionConfigOption[] = acpConfiguration.map(
  (option) => {
    if (option.type === 'boolean') return { ...option, currentValue: true };

    return {
      ...option,
      currentValue: selected.get(option.id) ?? option.currentValue,
    };
  },
);

type HeldConfigurationScenario = {
  scenario: ScriptedScenario;
  finishTurn: PromiseWithResolvers<void>;
  applying: PromiseWithResolvers<SetSessionConfigOptionRequest>;
  finishConfig: PromiseWithResolvers<void>;
  prompted: PromiseWithResolvers<PromptRequest>;
  commands: (PromptRequest | SetSessionConfigOptionRequest)[];
};

export function heldConfigurationScenario(): HeldConfigurationScenario {
  const finishTurn = Promise.withResolvers<void>();
  const applying = Promise.withResolvers<SetSessionConfigOptionRequest>();
  const finishConfig = Promise.withResolvers<void>();
  const prompted = Promise.withResolvers<PromptRequest>();
  const commands: (PromptRequest | SetSessionConfigOptionRequest)[] = [];

  const scenario = scriptedConfiguration({
    finishTurn,
    applying,
    finishConfig,
    prompted,
    commands,
  });

  return { scenario, finishTurn, applying, finishConfig, prompted, commands };
}

type ConfigurationEvents = Omit<HeldConfigurationScenario, 'scenario'>;

const scriptedConfiguration = (
  events: ConfigurationEvents,
): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps: [],
  responses: {
    'session/prompt': promptResponses(events),
    'session/set_config_option': configurationResponses(events),
  },
});

const promptResponses = (
  events: ConfigurationEvents,
): NonNullable<ScriptedScenario['responses']>['session/prompt'] => [
  {
    requests: events.commands,
    received: events.prompted,
    waitFor: events.finishTurn.promise,
  },
  { requests: events.commands },
];

const configurationResponses = (
  events: ConfigurationEvents,
): NonNullable<ScriptedScenario['responses']>['session/set_config_option'] => [
  {
    requests: events.commands,
    received: events.applying,
    waitFor: events.finishConfig.promise,
    result: { configOptions: appliedConfiguration },
  },
  {
    requests: events.commands,
    result: { configOptions: appliedConfiguration },
  },
];
