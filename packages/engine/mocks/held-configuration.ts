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

  const scenario: ScriptedScenario = {
    configOptions: acpConfiguration,
    steps: [],
    responses: {
      'session/prompt': [
        { requests: commands, received: prompted, waitFor: finishTurn.promise },
        { requests: commands },
      ],
      'session/set_config_option': [
        {
          requests: commands,
          received: applying,
          waitFor: finishConfig.promise,
          result: { configOptions: appliedConfiguration },
        },
        { requests: commands, result: { configOptions: appliedConfiguration } },
      ],
    },
  };

  return { scenario, finishTurn, applying, finishConfig, prompted, commands };
}
