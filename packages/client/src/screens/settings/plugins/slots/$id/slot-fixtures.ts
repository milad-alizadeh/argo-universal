import { pluginSymbol } from '../../../../../lib/product/plugin-symbol';
import type { SessionBarPreviewData } from './session-bar-preview';
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

const deploys: SlotPlugin = {
  pluginId: 'deploys',
  name: 'Deploys',
  fills: true,
  shown: true,
  asks: true,
};

// Fills the Slot but does not ask for its Single-owner Slot.
const coverage: SlotPlugin = {
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
  lookup: (pluginId) => ({
    name:
      slotPlugins.find((plugin) => plugin.pluginId === pluginId)?.name ??
      pluginId,
    icon: pluginSymbol({}),
  }),
  sent: {
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

export const issueTrackerBar = `${issueRef(412)} · In review`;

export const coverageBar = '78% covered';

// What the three Plugins answer for the preview's Session bar, as the Server sends it: one fits, the rest overflow.
export const sessionBarPreviewData: SessionBarPreviewData = {
  sent: {
    items: [
      {
        pluginId: issueTracker.pluginId,
        item: {
          icon: { sf: 'ticket', material: 'confirmation_number' },
          text: issueTrackerBar,
          action: { path: '/issues/412' },
        },
      },
    ],
    overflow: [
      {
        pluginId: deploys.pluginId,
        item: {
          icon: { sf: 'checkmark.circle', material: 'check_circle' },
          text: previewReady,
          action: { path: '/deploys/latest' },
        },
      },
      { pluginId: coverage.pluginId, item: { text: coverageBar } },
    ],
  },
  lookup: (pluginId) => sessionRowPreviewData.lookup(pluginId),
};
