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

/*
 * Where the call is, for the pointer in another Session's Composer: that Session's title, as the Sessions list reads it,
 * and a way there.
 */
export function useCallPointer(
  callSession: string | undefined,
  sessionId: string,
): ComposerVoice['elsewhere'] {
  const trpc = useTRPC();
  const navigate = useNavigateFromShown();
  const target = elsewhereOf(callSession, sessionId);

  const listed = useQuery({
    ...trpc.session.list.queryOptions({ sessionId: target, archived: false }),
    enabled: target !== undefined,
  });

  if (!target) return undefined;

  return {
    title: listed.data?.sessions[0]?.title ?? 'another Session',
    onOpen: () => navigate(sessionHref(target)),
  };
}
