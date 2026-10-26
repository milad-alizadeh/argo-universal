import type * as React from 'react';
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
