import { describe, expect, it } from 'vitest';
import {
  getConfigOptionDiagnostics,
  SessionConfigOption,
} from './set-config-option';

const extensionOption = {
  configId: 'extension',
  name: 'Extension',
  category: 'custom_category',
  type: 'select',
  currentValue: 'on',
  _meta: { extension: { enabled: true } },
  options: [
    {
      groupId: 'group',
      name: 'Group',
      _meta: { source: 'extension' },
      options: [
        {
          value: 'on',
          name: 'On',
          _meta: { argo: { icon: 'Shield', tone: 'safe' }, extension: 1 },
        },
      ],
    },
  ],
};

it('keeps extension categories and metadata on options, groups and values', (): void => {
  const before = getConfigOptionDiagnostics().unknownCategories;
  expect(SessionConfigOption.parse(extensionOption)).toEqual(extensionOption);
  expect(getConfigOptionDiagnostics().unknownCategories).toBe(before + 1);
});

describe('config option category diagnostics', (): void => {
  it.each([
    { category: 'mode', unknown: 0 },
    { category: 'model_config', unknown: 0 },
    // Outside the ACP spec, sent by codex-acp, and drawn by Configure.
    { category: 'collaboration_mode', unknown: 0 },
    // The spec keeps the leading underscore for an Agent's own categories.
    { category: '_personality', unknown: 0 },
    { category: 'invented', unknown: 1 },
  ])('counts $category as $unknown unknown', ({ category, unknown }): void => {
    const before = getConfigOptionDiagnostics().unknownCategories;

    SessionConfigOption.parse({ ...extensionOption, category });

    expect(getConfigOptionDiagnostics().unknownCategories).toBe(
      before + unknown,
    );
  });
});
