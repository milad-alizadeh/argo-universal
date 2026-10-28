import type { SessionBarProps } from '#features/sessions';

// The Session page's bar: three Plugins, the first shown, two behind "+2".
export const sessionPageBar: SessionBarProps = {
  shown: {
    pluginId: 'issue-tracker',
    pluginName: 'Issue tracker',
    icon: { sf: 'ticket', material: 'confirmation_number' },
    text: '#412 · In review',
    path: '/issues/412',
  },
  hidden: [
    {
      pluginId: 'deploys',
      pluginName: 'Deploys',
      text: 'Preview ready',
      path: '/deploys/latest',
    },
    { pluginId: 'coverage', pluginName: 'Coverage', text: '78% covered' },
  ],
  onOpen: () => {},
};
