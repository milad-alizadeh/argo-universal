import type { Argo, NamedQuery } from '@argo/plugin-kit';
import { text, type Json } from './json';
import { bodyOf, call } from './pull-reads';

type Fetch = Argo['fetch'];

export type ViewerTarget = { projectId: string };

const invalid = 'GitHub returned an invalid account.';

// The login of the account the Project reads GitHub as.
export async function fetchViewer(
  fetch: Fetch,
  { projectId }: ViewerTarget,
): Promise<string> {
  const viewer: Json = JSON.parse(
    await bodyOf(fetch, call('/user', projectId), 'The signed-in account'),
  );

  return text(viewer, invalid, 'login');
}

export type ViewerReads = {
  // The signed-in account, shared by every pull request of the Project.
  viewer: (target: ViewerTarget) => NamedQuery<string>;
};

// A named read like the pull request's own (ADR-0037): a failed read throws, so it is never taken for nobody.
export const defineViewerReads = (argo: Argo): ViewerReads => ({
  viewer: argo.queries.define(
    'viewer',
    (target: ViewerTarget) => fetchViewer(argo.fetch, target),
    { projectOf: ({ projectId }: ViewerTarget) => projectId },
  ),
});
