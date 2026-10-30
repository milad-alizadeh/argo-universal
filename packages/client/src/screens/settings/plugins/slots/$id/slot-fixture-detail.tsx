import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import type { SessionPluginCard } from '../../../../sessions/$id/sections/plugin-card-section';
import { declaredHeaderActions } from '../../../../sessions/$id/session-header-actions.mocks';
import { SessionBarPreview } from './session-bar-preview';
import { sessionBarSlot } from './session-bar-slot';
import { SessionHeaderPreview } from './session-header-preview';
import { sessionHeaderSlot } from './session-header-slot';
import { SessionRowPreview } from './session-row-preview';
import { sessionRowSlot } from './session-row-slot';
import { WorkbenchCardsPreview } from './session-workbench-preview';
import { sessionWorkbenchSlot } from './session-workbench-slot';
import type { SlotPreviewProps, SlotDetail } from './slot-detail';
import {
  coverageBar,
  issueTrackerBar,
  previewReady,
  sessionBarPreviewData,
  sessionRowPreviewData,
} from './slot-fixtures';

const FixturePreview = ({
  visibility,
}: SlotPreviewProps): React.JSX.Element => (
  <SessionRowPreview data={sessionRowPreviewData} visibility={visibility} />
);

// The Session rows page with the fixture Plugins' answers in place of the Server's.
export const fixtureSessionRowSlot: SlotDetail = {
  ...sessionRowSlot,
  Preview: FixturePreview,
};

const FixtureBarPreview = ({
  visibility,
}: SlotPreviewProps): React.JSX.Element => (
  <SessionBarPreview data={sessionBarPreviewData} visibility={visibility} />
);

// The Session bar page with the fixture Plugins' answers in place of the Server's.
export const fixtureSessionBarSlot: SlotDetail = {
  ...sessionBarSlot,
  Preview: FixtureBarPreview,
};

const FixtureHeaderPreview = ({
  visibility,
}: SlotPreviewProps): React.JSX.Element => (
  <SessionHeaderPreview
    declared={declaredHeaderActions}
    visibility={visibility}
  />
);

// The Session header page with the fixture Plugins' declared actions in place of the Server's.
export const fixtureSessionHeaderSlot: SlotDetail = {
  ...sessionHeaderSlot,
  Preview: FixtureHeaderPreview,
};

// What the three fixture Plugins put in a Session's Workbench: a card each, with the page the Plugin draws inside it.
const workbenchCards: readonly SessionPluginCard[] = [
  {
    pluginId: 'issue-tracker',
    card: {
      id: 'issue',
      title: 'Issue',
      icon: { sf: 'ticket', material: 'confirmation_number' },
      page: '/issues/session',
      tab: '/issues/session/full',
    },
    page: <Text>{issueTrackerBar}</Text>,
    tab: <Text>{issueTrackerBar}</Text>,
  },
  {
    pluginId: 'deploys',
    card: {
      id: 'deploy',
      title: 'Deploy',
      icon: { sf: 'checkmark.circle', material: 'check_circle' },
      page: '/deploys/session',
    },
    page: <Text>{previewReady}</Text>,
  },
  {
    pluginId: 'coverage',
    card: {
      id: 'coverage',
      title: 'Coverage',
      icon: { material: 'percent' },
      page: '/coverage/session',
    },
    page: <Text>{coverageBar}</Text>,
  },
];

const FixtureWorkbenchPreview = ({
  visibility,
}: SlotPreviewProps): React.JSX.Element => (
  <WorkbenchCardsPreview cards={workbenchCards} visibility={visibility} />
);

// The Workbench cards page with the fixture Plugins' cards in place of the Server's.
export const fixtureSessionWorkbenchSlot: SlotDetail = {
  ...sessionWorkbenchSlot,
  Preview: FixtureWorkbenchPreview,
};
