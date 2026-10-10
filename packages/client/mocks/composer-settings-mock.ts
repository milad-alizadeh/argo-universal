import type { SessionConfigOption } from '@repo/contracts';

export const composerSettingsOptions: SessionConfigOption[] = [
  { configId: 'fast', name: 'Fast mode', type: 'boolean', currentValue: false },
  {
    configId: 'response-style',
    name: 'Response style',
    type: 'select',
    currentValue: 'concise',
    options: [
      { value: 'concise', name: 'Concise' },
      { value: 'detailed', name: 'Detailed' },
    ],
  },
];
export const composerLongSettingsOptions: SessionConfigOption[] = [
  ...composerSettingsOptions,
  {
    configId: 'profile',
    name: 'Profile',
    type: 'select',
    currentValue: 'profile-1',
    options: Array.from({ length: 40 }, (_, index) => ({
      value: `profile-${index + 1}`,
      name: `Profile ${index + 1}`,
    })),
  },
];

export function updateComposerSettings(
  options: SessionConfigOption[],
  configId: string,
  value: string | boolean,
): SessionConfigOption[] {
  return options.map((option) => {
    if (option.configId !== configId) return option;
    if (option.type === 'boolean' && typeof value === 'boolean')
      return { ...option, currentValue: value };
    if (option.type === 'select' && typeof value === 'string')
      return { ...option, currentValue: value };
    return option;
  });
}
