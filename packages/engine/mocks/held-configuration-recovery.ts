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

  const scenario = recoveryScenario(
    { finish, prompted, commands },
    rejectFirst,
  );

  return { scenario, finish, prompted, commands };
}

type RecoveryEvents = Omit<HeldRecoveryScenario, 'scenario'>;

const recoveryScenario = (
  events: RecoveryEvents,
  rejectFirst: boolean,
): ScriptedScenario => ({
  configOptions: acpConfiguration,
  steps: [],
  responses: {
    'session/close': closeResponses(),
    'session/prompt': promptResponses(events),
    'session/set_config_option': configResponses(events.commands, rejectFirst),
  },
});

const closeResponses = (): NonNullable<
  ScriptedScenario['responses']
>['session/close'] => [
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
];

const promptResponses = (
  events: RecoveryEvents,
): NonNullable<ScriptedScenario['responses']>['session/prompt'] => [
  {
    requests: events.commands,
    received: events.prompted,
    waitFor: events.finish.promise,
  },
  { requests: events.commands },
];

const configResponses = (
  commands: RecoveryEvents['commands'],
  rejectFirst: boolean,
): NonNullable<ScriptedScenario['responses']>['session/set_config_option'] => {
  const accepted = {
    requests: commands,
    result: { configOptions: configuration },
  };

  const initial = rejectFirst
    ? { requests: commands, error: 'Configuration temporarily unavailable' }
    : accepted;

  return [initial, accepted];
};
