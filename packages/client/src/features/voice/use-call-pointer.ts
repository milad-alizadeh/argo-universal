import { useQuery } from '@tanstack/react-query';
import type { ComposerVoice } from '#features/composer';
import { useTRPC } from '#features/connection';
import { sessionHref } from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';

// The Session another Session's Composer points at: the one the call runs in, when it is not this one.
const elsewhereOf = (
  callSession: string | undefined,
  sessionId: string,
): string | undefined => (callSession === sessionId ? undefined : callSession);

const fallbackTitle = 'another Session';

// A Session's title, as the Sessions list reads it; none until it loads, or without a Session.
function useSessionTitle(sessionId: string | undefined): string | undefined {
  const trpc = useTRPC();
  const input = { sessionId, archived: false };

  const listed = useQuery({
    ...trpc.session.list.queryOptions(input),
    enabled: sessionId !== undefined,
  });

  return listed.data?.sessions[0]?.title;
}

/*
 * Where the call is, for the pointer in another Session's Composer: that Session's title and a way there.
 */
export function useCallPointer(
  callSession: string | undefined,
  sessionId: string,
): ComposerVoice['elsewhere'] {
  const navigate = useNavigateFromShown();
  const target = elsewhereOf(callSession, sessionId);
  const title = useSessionTitle(target);

  if (!target) return undefined;

  return {
    title: title ?? fallbackTitle,
    onOpen: () => navigate(sessionHref(target)),
  };
}
