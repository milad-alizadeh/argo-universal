import type { SessionInfo } from '@repo/contracts';
import {
  mergedItems,
  SessionActivityItem,
  SessionRowItem,
  type SlotItems,
  type SlotItemsInput,
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
import { useSlotItems } from '../../../../plugins/use-slot-items';
import type { SlotPreviewProps } from './slot-detail';

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

// The Slot's list for one real Session; the stand-in Session is never sent to a Plugin.
const contextsOf = (
  session: SessionInfo | undefined,
): SlotItemsInput['contexts'] | undefined =>
  session && [{ sessionId: session.sessionId, projectId: session.projectId }];

const inputOf = (
  slotId: SlotItemsInput['slotId'],
  contexts: SlotItemsInput['contexts'] | undefined,
): SlotItemsInput | undefined => contexts && { slotId, contexts };

/*
 * The latest Session with what the Server's Plugins answer for it, so the preview is a real row; `fallback` stands in,
 * with no Plugin answers, while there is no Session.
 */
function usePreviewData(
  latest: SessionInfo | undefined,
  fallback: SessionInfo,
): SessionRowPreviewData {
  const contexts = contextsOf(latest);
  const items = useSlotItems(inputOf(sessionRowSlotId, contexts));
  const lines = useSlotItems(inputOf(sessionActivitySlotId, contexts));
  const session = latest ?? fallback;

  return {
    session,
    age: formatAge(useClock(true) - session.activityAt),
    items: answerOf(RowItems, items, session.sessionId),
    lines: answerOf(ActivityLines, lines, session.sessionId),
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
