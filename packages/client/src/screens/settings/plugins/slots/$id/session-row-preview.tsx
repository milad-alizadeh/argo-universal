import type { SessionInfo } from '@repo/contracts';
import { formatAge } from '@repo/kit/format-elapsed';
import { useClock } from '@repo/kit/use-clock';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import { SessionRow } from '#features/sessions';
import type { SlotVisibility } from '#features/settings';
import { rowDrawing } from '../../../../plugins/session-row-drawing';
import type { PluginLookup } from '../../../../plugins/slot-items';
import { usePluginLookup } from '../../../../plugins/use-plugin-names';
import {
  type SentRowItems,
  useSentRowItems,
} from '../../../../plugins/use-session-row-answers';
import type { SlotPreviewProps } from './slot-detail';

// What the preview draws: a Session and the Plugins' answers for it, before this page's choices apply.
export interface SessionRowPreviewData {
  session: SessionInfo;
  age: string;
  sent: SentRowItems;
  lookup: PluginLookup;
}

type PreviewProps = { data: SessionRowPreviewData; visibility: SlotVisibility };

/*
 * The Sessions list's own row, under the page's choices, drawn by the same rules as the list: the Plugins left on fill
 * its items, and the chosen Plugin writes its Activity line. It is a preview, so pressing it, or an item, does nothing.
 */
export const SessionRowPreview = ({
  data,
  visibility,
}: PreviewProps): React.JSX.Element => (
  <SessionRow
    session={data.session}
    logo=""
    age={data.age}
    plugins={rowDrawing(visibility, data.lookup)(
      data.sent.items,
      data.sent.lines,
    )}
    onSelect={ignore}
  />
);

const ignore = (): void => undefined;

/*
 * The latest Session with what the Server's Plugins answer for it, so the preview is a real row; `fallback` stands in,
 * with no Plugin answers, while there is no Session. The stand-in Session is never sent to a Plugin.
 */
function usePreviewData(
  latest: SessionInfo | undefined,
  fallback: SessionInfo,
): SessionRowPreviewData {
  const session = latest ?? fallback;

  return {
    session,
    age: formatAge(useClock(true) - session.activityAt),
    // The stand-in is never asked about, so it has no answers.
    sent: useSentRowItems(latest),
    lookup: usePluginLookup(),
  };
}

// The newest Session not archived, which a Slot's preview draws for real.
export function useLatestSession(): SessionInfo | undefined {
  const trpc = useTRPC();

  const { data } = useQuery(
    trpc.session.list.queryOptions({ archived: false }),
  );

  return data?.sessions[0];
}

// The preview on the App: the latest Session, or `fallback` while there is none.
export const livePreview =
  (fallback: SessionInfo) =>
  ({ visibility }: SlotPreviewProps): React.JSX.Element => (
    <SessionRowPreview
      data={usePreviewData(useLatestSession(), fallback)}
      visibility={visibility}
    />
  );
