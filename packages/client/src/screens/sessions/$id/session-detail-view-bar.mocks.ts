import type { SessionBarEntry, SessionBarProps } from '#features/sessions';

export const issueLine: SessionBarEntry = {
  pluginId: 'issue-tracker',
  pluginName: 'Issue tracker',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  text: '#412 · In review',
  path: '/issues/412',
};

export const deploysLine: SessionBarEntry = {
  pluginId: 'deploys',
  pluginName: 'Deploys',
  text: 'Preview ready',
  path: '/deploys/latest',
};

// A line with no page to open.
export const coverageLine: SessionBarEntry = {
  pluginId: 'coverage',
  pluginName: 'Coverage',
  text: '78% covered',
};

// The Session page's bar: three Plugins, the first shown, two behind "+2".
export const sessionPageBar: SessionBarProps = {
  shown: issueLine,
  hidden: [deploysLine, coverageLine],
  onOpen: () => {},
};
