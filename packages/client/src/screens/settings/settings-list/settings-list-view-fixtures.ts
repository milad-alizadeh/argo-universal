import type { SettingsListViewProps } from './settings-list-props';
import { settingsListViewMocks } from './settings-list-view.mocks';

type SettingsListViewState = Omit<
  SettingsListViewProps,
  'onSelect' | 'onThemeChange'
>;

const base = {
  ...settingsListViewMocks,
  projectsNeedAttention: true,
  accountState: 'GitHub',
  deviceCount: 2,
  selectedPath: '/settings/accounts',
} satisfies SettingsListViewState;

export const readySettings: SettingsListViewState = {
  ...base,
  status: 'ready',
};

// The Server has not answered yet: its pages are disabled and counts read "…".
export const loadingSettings: SettingsListViewState = {
  ...base,
  status: 'loading',
  projectCount: undefined,
  agentCount: undefined,
  pluginCount: undefined,
};

// The Server is unreachable: its pages are disabled, counts keep their last value.
export const disconnectedSettings: SettingsListViewState = {
  ...base,
  status: 'disconnected',
};
