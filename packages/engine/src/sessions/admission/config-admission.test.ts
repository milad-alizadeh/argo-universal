import type { SessionConfigOption } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  hasConfigurationCapacity,
  isOfferedConfigChoice,
} from './config-admission';

const options: SessionConfigOption[] = [
  {
    configId: 'mode',
    name: 'Mode',
    type: 'select',
    currentValue: 'ask',
    options: [
      { value: 'ask', name: 'Ask' },
      { value: 'code', name: 'Code' },
    ],
  },
  {
    configId: 'model',
    name: 'Model',
    type: 'select',
    currentValue: 'fast',
    options: [
      {
        groupId: 'small',
        name: 'Small',
        options: [{ value: 'fast', name: 'Fast' }],
      },
      {
        groupId: 'large',
        name: 'Large',
        options: [{ value: 'deep', name: 'Deep' }],
      },
    ],
  },
  { configId: 'fast', name: 'Fast mode', type: 'boolean', currentValue: false },
];

it.each([
  {
    name: 'admits a listed choice',
    configId: 'mode',
    value: 'code',
    offered: true,
  },
  {
    name: 'admits a choice inside a group',
    configId: 'model',
    value: 'deep',
    offered: true,
  },
  {
    name: 'admits either value of a switch',
    configId: 'fast',
    value: true,
    offered: true,
  },
  {
    name: 'refuses an unlisted choice',
    configId: 'mode',
    value: 'plan',
    offered: false,
  },
  {
    name: 'refuses an unlisted grouped choice',
    configId: 'model',
    value: 'small',
    offered: false,
  },
  {
    name: 'refuses a word for a switch',
    configId: 'fast',
    value: 'true',
    offered: false,
  },
  {
    name: 'refuses a switch value for a list',
    configId: 'mode',
    value: true,
    offered: false,
  },
  {
    name: 'refuses a setting the Agent did not offer',
    configId: 'effort',
    value: 'high',
    offered: false,
  },
])('$name', ({ configId, value, offered }): void => {
  expect(isOfferedConfigChoice(options, { configId, value })).toBe(offered);
});

it.each([
  ['admits a choice into an empty queue', 0, true],
  ['admits the thirty-second queued choice', 31, true],
  ['refuses a choice into a full queue', 32, false],
] as const)('%s', (_name, queued, expected): void => {
  expect(hasConfigurationCapacity(queued)).toBe(expected);
});
