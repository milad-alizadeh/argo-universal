import type { SessionInfo } from '@repo/contracts';
import {
  mergedItems,
  SessionActivityItem,
  SessionRowItem,
  type SlotItems,
  sessionActivitySlotId,
  sessionRowSlotId,
} from '@repo/contracts/plugins/wire';
import { formatAge } from '@repo/kit/format-elapsed';
import { useClock } from '@repo/kit/use-clock';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import type { z } from 'zod';
import { useTRPC } from '#features/connection';
import { SessionRow } from '#features/sessions';
import {
  ownerItem,
  type SlotVisibility,
  visibleItems,
} from '#features/settings';
import type { SlotPreviewProps } from './slot-settings';
import { useSlotItems } from './use-slot-items';

// A Server that sent no answer for the Session, or something else, gives none.
const noAnswer = { items: [], overflow: [] };

const RowItems = mergedItems(SessionRowItem).catch(noAnswer);

const ActivityLines = mergedItems(SessionActivityItem).catch(noAnswer);

// What the preview draws: a Session and the Plugins' answers for it, before this page's choices apply.
export interface SessionRowPreviewData {
  session: SessionInfo;
  age: string;
  items: z.infer<typeof RowItems>;
  lines: z.infer<typeof ActivityLines>;
}

type PreviewProps = { data: SessionRowPreviewData; visibility: SlotVisibility };

/*
 * The Sessions list's own row, under the page's choices: the Plugins left on fill its items, and the chosen Plugin
 * writes its Activity line.
 */
export const SessionRowPreview = ({
  data,
  visibility,
}: PreviewProps): React.JSX.Element => (
  <SessionRow
    session={withActivity(data, visibility)}
    logo=""
    age={data.age}
    items={visibleItems(data.items, visibility)}
    onSelect={ignore}
  />
);

const withActivity = (
  { session, lines }: SessionRowPreviewData,
  visibility: SlotVisibility,
): SessionInfo => ({
  ...session,
  activity: ownerItem(lines, visibility)?.text ?? session.activity,
});

const ignore = (): void => undefined;

// One context's answer, read as the Slot's own items.
const answerOf = <Answer,>(
  schema: z.ZodType<Answer>,
  answers: SlotItems,
  key: string,
): Answer => schema.parse(answers[key]);

// The latest Session with what the Server's Plugins answer for it, so the preview is a real row.
function usePreviewData(session: SessionInfo): SessionRowPreviewData {
  const contexts = [
    { sessionId: session.sessionId, projectId: session.projectId },
  ];

  const items = useSlotItems({ slotId: sessionRowSlotId, contexts });
  const lines = useSlotItems({ slotId: sessionActivitySlotId, contexts });

  return {
    session,
    age: formatAge(useClock(true) - session.activityAt),
    items: answerOf(RowItems, items, session.sessionId),
    lines: answerOf(ActivityLines, lines, session.sessionId),
  };
}

function useLatestSession(): SessionInfo | undefined {
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
      data={usePreviewData(useLatestSession() ?? fallback)}
      visibility={visibility}
    />
  );
