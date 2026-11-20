import type { SessionInfo } from '@repo/contracts';
import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import { formatAge } from '@repo/kit/format-elapsed';
import type { SessionRowDrawingProps } from '@repo/kit/session-row-drawing';
import { useClock } from '@repo/kit/use-clock';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useMemo } from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import {
  type OpenPluginItemPage,
  SessionRow,
  type SessionRowPlugins,
} from '#features/sessions';
import { useSlotChoices } from '#features/settings';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { usePluginLookup } from '../hooks/use-plugin-names';
import { useSentRowItems } from '../hooks/use-session-row-answers';
import { sentDrawing } from '../utils/session-row-drawing';

// The Session as the Sessions list reads it, live; none while it loads, or for one the Server does not list.
function useListedSession(sessionId: string): SessionInfo | undefined {
  const trpc = useTRPC();
  const input = { sessionId, archived: false };

  return useQuery(trpc.session.list.queryOptions(input)).data?.sessions[0];
}

// What the Plugins add to the row, under this Device's Slot choices, as the list draws it.
function useRowPlugins(
  session: SessionInfo | undefined,
): SessionRowPlugins | undefined {
  const choices = useSlotChoices(sessionRowSlotId);
  const lookup = usePluginLookup();
  const items = useSentRowItems(session);

  return useMemo(
    () => sentDrawing(choices, lookup)(items),
    [choices, lookup, items],
  );
}

// The Agent's logo and how long ago the Session was active, as a list row shows them.
interface RowLook {
  logo: string;
  age: string;
}

function useRowLook(session: SessionInfo): RowLook {
  const agents = loadedAgents(useInstalledAgents());
  const now = useClock(true);
  const agent = agents.find(({ id }) => id === session.agent);

  return { logo: agent?.icon ?? '', age: formatAge(now - session.activityAt) };
}

// Pressing the row runs the Plugin's `onPress`, or opens the Session.
function useRowPress(
  onPress: (() => void) | undefined,
): (sessionId: string) => void {
  const navigate = useNavigateFromShown();

  return onPress ?? ((id: string) => navigate(sessionHref(id)));
}

// The page a Plugin item on the row opens: the App's opener, handed in by the screen that draws the Plugin's tree.
type Opener = { onOpenPluginPage: OpenPluginItemPage };

type DrawnRow = SessionRowDrawingProps & Opener;

type ShownRow = DrawnRow & { session: SessionInfo };

function ShownSessionRow({
  session,
  onPress,
  onOpenPluginPage,
}: ShownRow): React.JSX.Element {
  return (
    <SessionRow
      session={session}
      {...useRowLook(session)}
      plugins={useRowPlugins(session)}
      onOpenPluginPage={onOpenPluginPage}
      onSelect={useRowPress(onPress)}
    />
  );
}

/*
 * A Session's row for a kit SessionRow in a Plugin's tree: the Sessions list's own row, read live from the Server and
 * drawn under this Device's Slot choices, so it never goes stale and shows what the list shows. A Session the Server
 * does not list, such as an archived or deleted Session or a child Session, draws nothing.
 */
function PluginSessionRow(props: DrawnRow): React.JSX.Element | null {
  const session = useListedSession(props.sessionId);

  return session ? <ShownSessionRow {...props} session={session} /> : null;
}

// How a kit SessionRow draws, with the items on it opening pages through `onOpenPluginPage`.
export const drawPluginSessionRow =
  (onOpenPluginPage: OpenPluginItemPage) =>
  (props: SessionRowDrawingProps): React.JSX.Element => (
    <PluginSessionRow {...props} onOpenPluginPage={onOpenPluginPage} />
  );
