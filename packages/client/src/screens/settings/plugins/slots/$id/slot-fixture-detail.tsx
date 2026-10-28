import type * as React from 'react';
import { declaredHeaderActions } from '../../../../sessions/$id/session-header-actions.mocks';
import { SessionHeaderPreview } from './session-header-preview';
import { sessionHeaderSlot } from './session-header-slot';
import { SessionRowPreview } from './session-row-preview';
import { sessionRowSlot } from './session-row-slot';
import type { SlotPreviewProps, SlotDetail } from './slot-detail';
import { sessionRowPreviewData } from './slot-fixtures';

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
