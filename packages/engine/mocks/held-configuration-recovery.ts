import type {
  PromptRequest,
  SessionConfigOption,
  SetSessionConfigOptionRequest,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';

const configuration: SessionConfigOption[] = acpConfiguration.map((option) => {
  if (option.type === 'boolean') return { ...option, currentValue: true };

  return option.id === 'mode' ? { ...option, currentValue: 'plan' } : option;
});

type HeldRecoveryScenario = {
  scenario: ScriptedScenario;
  finish: PromiseWithResolvers<void>;
  prompted: PromiseWithResolvers<PromptRequest>;
  commands: (PromptRequest | SetSessionConfigOptionRequest)[];
};

export function heldRecoveryScenario(
  rejectFirst = false,
): HeldRecoveryScenario {
  const finish = Promise.withResolvers<void>();
  const prompted = Promise.withResolvers<PromptRequest>();
  const commands: HeldRecoveryScenario['commands'] = [];

  const accepted = {
    requests: commands,
    result: { configOptions: configuration },
  };

  const initial = rejectFirst
    ? { requests: commands, error: 'Configuration temporarily unavailable' }
    : accepted;

  const scenario: ScriptedScenario = {
    configOptions: acpConfiguration,
    steps: [],
    responses: {
      'session/close': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'config_option_update',
                configOptions: acpConfiguration,
              },
            },
          ],
        },
      ],
      'session/prompt': [
        { requests: commands, received: prompted, waitFor: finish.promise },
        { requests: commands },
      ],
      'session/set_config_option': [initial, accepted],
    },
  };

  return { scenario, finish, prompted, commands };
}
