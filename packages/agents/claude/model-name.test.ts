import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { expect, it } from 'vitest';
import { startingValues, toConfigOptions } from './config-options';
const paddedLabel = 'Local model  ';
it.each([
  [paddedLabel, paddedLabel],
  ['Local model (recommended)  ', 'Local model'],
])(
  'preserves the SDK label %j when naming the default model',
  (displayName, shortName): void => {
    const catalog = [
      { value: 'default', displayName, description: '' },
    ] satisfies ModelInfo[];
    const options = toConfigOptions(catalog, startingValues(catalog, []));
    expect(
      options.find((option): boolean => option.configId === 'model'),
    ).toMatchObject({
      options: [
        { name: `${shortName} (recommended)`, _meta: { argo: { shortName } } },
      ],
    });
  },
);
