import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { expect, it } from 'vitest';
import {
  startingValues as firstValues,
  toConfigOptions as firstOptions,
} from '../claude/config-options';
import {
  startingValues as secondValues,
  toConfigOptions as secondOptions,
} from '../codex/config-options';
import { response } from '../codex/mocks/models';
import { changeValue } from './config-options';

const firstModels = [
  {
    value: 'default',
    displayName: 'Example',
    description: '',
    supportsEffort: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
  },
] satisfies ModelInfo[];
const adapters = [
  {
    name: 'SDK adapter',
    options: firstOptions(firstModels, firstValues(firstModels, [])),
  },
  {
    name: 'protocol adapter',
    options: secondOptions(response.data, secondValues(response.data, [])),
  },
];
it.each(adapters)(
  '$name offers the common modes and effort labels',
  ({ options }): void => {
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          configId: 'mode',
          options: expect.arrayContaining([
            {
              value: 'default',
              name: 'Ask first',
              description: 'Asks before edits and commands',
              _meta: { argo: { icon: 'ShieldWarning', tone: 'safe' } },
            },
            {
              value: 'plan',
              name: 'Plan mode',
              description: 'Reads and plans, changes nothing',
              _meta: { argo: { icon: 'MapTrifold', tone: 'planning' } },
            },
          ]),
        }),
        expect.objectContaining({
          configId: 'effort',
          options: expect.arrayContaining([
            expect.objectContaining({ value: 'low', name: 'Low' }),
            expect.objectContaining({ value: 'medium', name: 'Medium' }),
            expect.objectContaining({ value: 'high', name: 'High' }),
            expect.objectContaining({ value: 'xhigh', name: 'Extra high' }),
            expect.objectContaining({ value: 'max', name: 'Max' }),
          ]),
        }),
      ]),
    );
  },
);
it('omits the effort selector for a model without levels', (): void => {
  const models = response.data.map((model) => ({
    ...model,
    supportedReasoningEfforts: [],
  }));
  expect(
    secondOptions(models, secondValues(models, [])).map(
      (option): string => option.configId,
    ),
  ).toEqual(['mode', 'model']);
});

const allowed = (wanted: Record<'choice', unknown>): { choice: string } => ({
  choice: wanted.choice === 'offered' ? 'offered' : 'fallback',
});
it.each([
  { configId: 'choice', value: 'offered', expected: { choice: 'offered' } },
  { configId: 'choice', value: 'missing', expected: undefined },
  { configId: 'unknown', value: 'offered', expected: undefined },
  { configId: 'toString', value: 'offered', expected: undefined },
  { configId: 'choice', value: true, expected: undefined },
])(
  'accepts only an offered own config value: $configId/$value',
  ({ configId, value, expected }): void => {
    expect(
      changeValue(allowed, { choice: 'fallback' }, { configId, value }),
    ).toEqual(expected);
  },
);
