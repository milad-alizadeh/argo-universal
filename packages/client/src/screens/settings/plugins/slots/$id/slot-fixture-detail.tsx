import type * as React from 'react';
import { SessionBarPreview } from './session-bar-preview';
import { sessionBarSlot } from './session-bar-slot';
import { SessionRowPreview } from './session-row-preview';
import { sessionRowSlot } from './session-row-slot';
import type { SlotPreviewProps, SlotDetail } from './slot-detail';
import { sessionBarPreviewData, sessionRowPreviewData } from './slot-fixtures';

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
