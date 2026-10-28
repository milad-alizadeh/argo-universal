import { pluginSymbol } from '../../../../../lib/product/plugin-symbol';
import type { SessionRowPreviewData } from './session-row-preview';
import { previewSession } from './session-row-slot';
import type { SlotPlugin } from './slot-detail-model';

export const issueRef = (number: number): string => `#${number}`;

export const issueTracker: SlotPlugin = {
  pluginId: 'issue-tracker',
  name: 'Issue tracker',
  fills: true,
  shown: true,
  asks: true,
};

export const deploys: SlotPlugin = {
  pluginId: 'deploys',
  name: 'Deploys',
  fills: true,
  shown: true,
  asks: true,
};

// Fills the Slot but does not ask for its Single-owner Slot.
export const coverage: SlotPlugin = {
  pluginId: 'coverage',
  name: 'Coverage',
  fills: true,
  shown: true,
  asks: false,
};

export const slotPlugins: SlotPlugin[] = [issueTracker, deploys, coverage];

export const deploysOff: SlotPlugin[] = [
  issueTracker,
  { ...deploys, shown: false },
  coverage,
];

export const issueTrackerOff: SlotPlugin[] = [
  { ...issueTracker, shown: false },
  deploys,
  coverage,
];

export const previewReady = 'Preview ready';

export const issueTrackerLine = 'Awaiting review · 1 of 2';

export const deploysLine = 'Deploying preview';

// What the three Plugins answer for the preview's Session, as the Server sends it.
export const sessionRowPreviewData: SessionRowPreviewData = {
  session: previewSession,
  age: '2m',
  pluginOf: (pluginId) => ({
    name:
      slotPlugins.find((plugin) => plugin.pluginId === pluginId)?.name ??
      pluginId,
    icon: pluginSymbol({}),
  }),
  answer: {
    items: {
      items: [
        {
          pluginId: issueTracker.pluginId,
          item: { text: issueRef(412), tone: 'info' },
        },
        {
          pluginId: deploys.pluginId,
          item: { text: previewReady, tone: 'success' },
        },
        { pluginId: coverage.pluginId, item: { text: '78%' } },
      ],
      overflow: [],
    },
    lines: {
      items: [
        { pluginId: issueTracker.pluginId, item: { text: issueTrackerLine } },
      ],
      overflow: [{ pluginId: deploys.pluginId, item: { text: deploysLine } }],
    },
  },
};
