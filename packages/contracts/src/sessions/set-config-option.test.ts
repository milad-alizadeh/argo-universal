import { describe, expect, it } from 'vitest';
import {
  getConfigOptionDiagnostics,
  SessionConfigOption,
  SessionConfigSelectOption,
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

describe('config option icon diagnostics', (): void => {
  it.each([
    { icon: 'ShieldWarning', unknown: 0 },
    { icon: 'Pencil', unknown: 0 },
    { icon: 'MapTrifold', unknown: 0 },
    { icon: 'Sparkles', unknown: 0 },
    { icon: 'WarningTriangle', unknown: 0 },
    { icon: 'ExtensionWidget', unknown: 1 },
    { icon: 'ShieldCheck', unknown: 1 },
    { icon: 'shieldWarning', unknown: 1 },
    { icon: 'constructor', unknown: 1 },
    { icon: '', unknown: 1 },
    { icon: undefined, unknown: 0 },
  ])(
    'keeps $icon and counts $unknown unknown names',
    ({ icon, unknown }): void => {
      const before = getConfigOptionDiagnostics();
      const option = { value: 'mode', name: 'Mode', _meta: { argo: { icon } } };
      expect(SessionConfigSelectOption.parse(option)).toEqual(option);
      expect(
        getConfigOptionDiagnostics().unknownIcons - before.unknownIcons,
      ).toBe(unknown);
      expect(getConfigOptionDiagnostics().unknownCategories).toBe(
        before.unknownCategories,
      );
    },
  );
});
