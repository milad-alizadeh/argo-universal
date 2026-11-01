import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/navigation';
import { type OpenLinkOutcome, openLinkOutcome } from './open-link-outcome';

type Navigate = ReturnType<typeof useNavigate>;

type Queries = {
  client: ReturnType<typeof useQueryClient>;
  trpc: ReturnType<typeof useTRPC>;
};

const notOpened = 'Argo could not open that link.';

// A function that stays the same while it always calls the latest `navigate`.
function useStableNavigate(): Navigate {
  const navigate = useNavigate();
  const latest = useRef(navigate);

  useEffect(() => {
    latest.current = navigate;
  }, [navigate]);

  return useCallback<Navigate>((href) => latest.current(href), []);
}

async function settled(
  link: string,
  { client, trpc }: Queries,
): Promise<OpenLinkOutcome> {
  const [server, projects] = await Promise.all([
    client.fetchQuery(trpc.navigation.server.queryOptions()),
    client.fetchQuery(trpc.project.list.queryOptions()),
  ]);

  return openLinkOutcome({
    link,
    stray: false,
    serverId: server.serverId,
    projects,
  });
}

async function resolved(
  link: string,
  queries: Queries,
): Promise<OpenLinkOutcome> {
  try {
    return await settled(link, queries);
  } catch {
    return { status: 'loading' };
  }
}

function present(outcome: OpenLinkOutcome, navigate: Navigate): void {
  if (outcome.status === 'open') return navigate(outcome.href);

  showToast({
    tone: 'danger',
    title: 'Link not opened',
    message: outcome.status === 'refused' ? outcome.message : notOpened,
  });
}

/*
 * Opens a Screen link in the running App through the one resolver the `/open` route uses, with the Server's id and
 * Projects read first. A refusal is a toast and navigates nowhere.
 */
export function useOpenScreenLink(): (link: string) => Promise<void> {
  const client = useQueryClient();
  const trpc = useTRPC();
  const navigate = useStableNavigate();

  return useCallback(
    async (link) => present(await resolved(link, { client, trpc }), navigate),
    [client, trpc, navigate],
  );
}
