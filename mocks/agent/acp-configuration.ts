import type {
  SessionConfigOption,
  SessionUpdate,
} from '@agentclientprotocol/sdk';
import type { ScriptedStep } from './scripted-scenario.ts';

export const acpConfiguration: SessionConfigOption[] = [
  {
    id: 'model',
    name: 'Model',
    category: 'model',
    type: 'select',
    currentValue: 'large',
    options: [
      { value: 'large', name: 'Large' },
      { value: 'small', name: 'Small' },
    ],
  },
  {
    id: 'effort',
    name: 'Effort',
    category: 'thought_level',
    type: 'select',
    currentValue: 'high',
    options: [
      { value: 'low', name: 'Low' },
      { value: 'high', name: 'High' },
    ],
  },
  {
    id: 'mode',
    name: 'Mode',
    category: 'mode',
    type: 'select',
    currentValue: 'code',
    options: [
      { value: 'code', name: 'Code' },
      { value: 'plan', name: 'Plan' },
    ],
  },
  {
    id: 'fast',
    name: 'Fast mode',
    category: 'model_config',
    type: 'boolean',
    currentValue: false,
  },
];

export const smallModelUpdate: SessionUpdate = {
  sessionUpdate: 'config_option_update',
  configOptions: acpConfiguration.map((option) =>
    option.id === 'model' && option.type === 'select'
      ? { ...option, currentValue: 'small' }
      : option,
  ),
};

const heldModeConfiguration: SessionConfigOption[] = acpConfiguration.map(
  (option) =>
    option.id === 'mode' && option.type === 'select'
      ? {
          ...option,
          currentValue: 'plan',
          _meta: { argo: { heldUntilNextTurn: true } },
        }
      : option,
);

export const heldModeSteps: ScriptedStep[] = [
  {
    type: 'update',
    update: {
      sessionUpdate: 'config_option_update',
      configOptions: heldModeConfiguration,
    },
  },
  { type: 'wait-for-cancel' },
];
