import type { SessionConfigOption } from '@agentclientprotocol/sdk';

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
      { value: 'high', name: 'High' },
      { value: 'low', name: 'Low' },
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
