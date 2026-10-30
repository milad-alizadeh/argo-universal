import type { SessionBarItem } from '@repo/contracts/plugins/session-bar-item';
import { sessionBarSlotId } from '@repo/contracts/plugins/wire';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { SessionBar } from '#features/sessions';
import type { SlotVisibility } from '#features/settings';
import { SessionBarStrip } from '#lib/product/session-bar-row';
import { sessionBarLines } from '../../../../plugins/session-bar-lines';
import {
  itemsSlotEntry,
  type PluginLookup,
  readSlotItems,
  type SentItems,
  type SlotReading,
} from '../../../../plugins/slot-items';
import { useSessionBarReading } from '../../../../plugins/use-session-bar';
import { useLatestSession } from './session-row-preview';
import type { SlotPreviewProps } from './slot-detail';

// What the preview draws: the Plugins' answers for a Session's bar as the Server sent them, before the page's choices.
export interface SessionBarPreviewData {
  sent: SentItems;
  lookup: PluginLookup;
}

type PreviewProps = { data: SessionBarPreviewData; visibility: SlotVisibility };

export const noBarLine = 'No Plugin left on sends a line for this Session.';

// The preview shows the bar only; Open does nothing here.
const ignore = (): void => undefined;

/*
 * The Session page's own bar from what the reader read: the first Plugin left on shows, and the rest wait behind
 * "+N". With none left on, the page says so, as the Session page draws no bar.
 */
function BarPreview({
  reading,
}: {
  reading: SlotReading<SessionBarItem>;
}): React.JSX.Element {
  const lines = sessionBarLines(reading);

  if (!lines) return <Text role="secondary">{noBarLine}</Text>;

  return (
    <SessionBarStrip inset>
      <SessionBar {...lines} onOpen={ignore} />
    </SessionBarStrip>
  );
}

const barSlot = itemsSlotEntry(sessionBarSlotId);

// The preview over given answers, read under the page's choices by the one Slot reader.
export const SessionBarPreview = ({
  data,
  visibility,
}: PreviewProps): React.JSX.Element => (
  <BarPreview
    reading={readSlotItems(barSlot, data.sent, {
      visibility,
      lookup: data.lookup,
    })}
  />
);

// The preview on the App: the bar the Server's Plugins send for the latest Session, read as the Session page reads it.
export function LiveSessionBarPreview({
  visibility,
}: SlotPreviewProps): React.JSX.Element {
  const latest = useLatestSession();

  const reading = useSessionBarReading(
    latest && { sessionId: latest.sessionId, projectId: latest.projectId },
    visibility,
  );

  return <BarPreview reading={reading} />;
}
