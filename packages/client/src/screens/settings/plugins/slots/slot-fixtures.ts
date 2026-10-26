import { issueRef, type SessionRowsPlugin } from './session-rows-model';

export const issueTracker: SessionRowsPlugin = {
  pluginId: 'issue-tracker',
  name: 'Issue tracker',
  shown: true,
  sample: { text: issueRef(412), tone: 'info' },
  activity: 'Awaiting review · 1 of 2',
};

export const deploys: SessionRowsPlugin = {
  pluginId: 'deploys',
  name: 'Deploys',
  shown: true,
  sample: { text: 'Preview ready', tone: 'success' },
  activity: 'Deploying preview',
};

// Fills the Slot but does not ask for the Activity line.
export const coverage: SessionRowsPlugin = {
  pluginId: 'coverage',
  name: 'Coverage',
  shown: true,
  sample: { text: '78%' },
};

export const sessionRowsPlugins: SessionRowsPlugin[] = [
  issueTracker,
  deploys,
  coverage,
];

export const deploysOff: SessionRowsPlugin[] = [
  issueTracker,
  { ...deploys, shown: false },
  coverage,
];
