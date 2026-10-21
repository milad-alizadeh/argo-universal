import type { LinkPreviewData } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { TRPCClient } from '@trpc/client';
import { useMemo, type ReactNode } from 'react';
import { useBlobUrl, useTRPCClient } from '#features/connection';
import {
  LinkPreviewContext,
  type LinkPreviewSource,
} from '#primitives/overlays/link-preview';
import { LinkPreviewCard } from '#primitives/overlays/link-preview';
import type { BlobUrl } from './features/connection/api/trpc/blob-url';
import { linkPreviewData } from './lib/product/link-preview-data';

export function LinkPreviewProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const client = useTRPCClient();
  const cache = useQueryClient();
  const imageUrl = useBlobUrl();

  const source = useMemo(
    () => previewSource(client, cache, imageUrl),
    [client, cache, imageUrl],
  );

  return <LinkPreviewContext value={source}>{children}</LinkPreviewContext>;
}

function previewSource(
  client: TRPCClient<AppRouter>,
  cache: QueryClient,
  imageUrl: BlobUrl,
): LinkPreviewSource {
  return {
    load: async (href): Promise<ReactNode> => {
      const data = await cache.fetchQuery(queryOptions(client, href));

      return card(data, imageUrl);
    },
  };
}

function card(data: LinkPreviewData | null, imageUrl: BlobUrl): ReactNode {
  return data ? (
    <LinkPreviewCard data={linkPreviewData(data, imageUrl)} />
  ) : null;
}

type PreviewQueryOptions = {
  queryKey: string[];
  queryFn: () => Promise<LinkPreviewData | null>;
  staleTime: number;
  retry: false;
};

function queryOptions(
  client: TRPCClient<AppRouter>,
  href: string,
): PreviewQueryOptions {
  return {
    queryKey: ['linkPreview', href],
    queryFn: () => client.linkPreview.get.query({ href }),
    staleTime: 30_000,
    retry: false,
  };
}
