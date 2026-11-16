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

export const secondIssueLine: SessionBarEntry = {
  ...issueLine,
  text: '#413 · Open',
  path: '/issues/413',
  tone: 'success',
};

export const attachedIssuesBar: SessionBarProps = {
  ...sessionPageBar,
  hidden: [secondIssueLine, ...sessionPageBar.hidden],
};

const detachOf = (number: number): SessionBarEntry['detach'] => ({
  operation: 'detach',
  args: { number },
});

// Two attached Issues, each with the `detach` the Issue tracker sends, so each line has its "…" menu.
export const detachableIssues: SessionBarEntry[] = [
  { ...issueLine, detach: detachOf(412) },
  { ...secondIssueLine, detach: detachOf(413) },
];

export const detachableIssuesBar: SessionBarProps = {
  shown: detachableIssues[0] ?? issueLine,
  hidden: detachableIssues.slice(1),
  onOpen: () => {},
};
