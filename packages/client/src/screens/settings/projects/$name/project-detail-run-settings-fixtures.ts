import type { RunSettingsList } from '@repo/contracts';

export const projectRunSettings: RunSettingsList = [
  {
    name: 'web',
    env: { API_URL: 'http://localhost:3101' },
    port: 3100,
    autoStart: false,
    canAutoStart: true,
  },
  {
    name: 'docs',
    env: {},
    port: null,
    autoStart: false,
    canAutoStart: false,
  },
];
