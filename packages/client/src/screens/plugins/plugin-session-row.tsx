import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import { formatAge } from '@repo/kit/format-elapsed';
import type { SessionRowDrawingProps } from '@repo/kit/session-row-drawing';
import { useClock } from '@repo/kit/use-clock';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useMemo } from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import { SessionRow } from '#features/sessions';
import { useSlotChoices } from '#features/settings';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { sentDrawing } from './session-row-drawing';
import { usePluginLookup } from './use-plugin-names';
import { useOpenPluginPage } from './use-plugin-opener';
import { useSentRowItems } from './use-session-row-answers';

/*
 * A Session's row for a kit SessionRow in a Plugin's tree: the Sessions list's own row, read live from the Server and
 * drawn under this Device's Slot choices, so it never goes stale and shows what the list shows. A Session the Server
 * does not list, such as a child Session or a deleted one, draws nothing.
 */
export function PluginSessionRow({
  sessionId,
  onPress,
}: SessionRowDrawingProps): React.JSX.Element | null {
  const trpc = useTRPC();
  const navigate = useNavigateFromShown();
  const openPage = useOpenPluginPage();
  const choices = useSlotChoices(sessionRowSlotId);
  const lookup = usePluginLookup();
  const agents = loadedAgents(useInstalledAgents());
  const now = useClock(true);

  const session = useQuery(trpc.session.list.queryOptions({ sessionId })).data
    ?.sessions[0];

  const sent = useSentRowItems(session);

  const plugins = useMemo(
    () => sentDrawing(choices, lookup)(sent.items, sent.lines),
    [choices, lookup, sent.items, sent.lines],
  );

  if (!session) return null;

  return (
    <SessionRow
      session={session}
      logo={agents.find(({ id }) => id === session.agent)?.icon ?? ''}
      age={formatAge(now - session.activityAt)}
      plugins={plugins}
      onOpenPluginPage={openPage}
      onSelect={(id) => (onPress ? onPress() : navigate(sessionHref(id)))}
    />
  );
}
