import type { SessionBarEntry, SessionBarProps } from './session-bar';

type Lines = Pick<SessionBarProps, 'shown' | 'hidden'>;

export const issueBar: SessionBarEntry = {
  pluginId: 'issue-tracker',
  pluginName: 'Issue tracker',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  text: '#412 · In review',
  path: '/issues/412',
};

export const deploysBar: SessionBarEntry = {
  pluginId: 'deploys',
  pluginName: 'Deploys',
  text: 'Preview ready',
  path: '/deploys/latest',
};

// A line with no page to open.
export const coverageBar: SessionBarEntry = {
  pluginId: 'coverage',
  pluginName: 'Coverage',
  text: '78% covered',
};

export const onePlugin: Lines = { shown: issueBar, hidden: [] };

export const threePlugins: Lines = {
  shown: issueBar,
  hidden: [deploysBar, coverageBar],
};

export const plainLine: Lines = { shown: coverageBar, hidden: [] };

export const longLine: Lines = {
  shown: {
    ...deploysBar,
    text: 'Preview deploy for fix-login-redirect is ready at the staging URL',
  },
  hidden: [issueBar],
};
