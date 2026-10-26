import type { SlotPlugin } from './slot-settings-model';

export const issueRef = (number: number): string => `#${number}`;

export const issueTracker: SlotPlugin = {
  pluginId: 'issue-tracker',
  name: 'Issue tracker',
  shown: true,
  sample: { text: issueRef(412), tone: 'info' },
  part: 'Awaiting review · 1 of 2',
};

export const deploys: SlotPlugin = {
  pluginId: 'deploys',
  name: 'Deploys',
  shown: true,
  sample: { text: 'Preview ready', tone: 'success' },
  part: 'Deploying preview',
};

// Fills the Slot but does not ask for its replaceable part.
export const coverage: SlotPlugin = {
  pluginId: 'coverage',
  name: 'Coverage',
  shown: true,
  sample: { text: '78%' },
};

export const slotPlugins: SlotPlugin[] = [issueTracker, deploys, coverage];

export const deploysOff: SlotPlugin[] = [
  issueTracker,
  { ...deploys, shown: false },
  coverage,
];
