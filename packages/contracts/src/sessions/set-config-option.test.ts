import { describe, expect, it } from 'vitest';
import {
  getConfigOptionDiagnostics,
  SessionConfigSelectOption,
} from './set-config-option';

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
