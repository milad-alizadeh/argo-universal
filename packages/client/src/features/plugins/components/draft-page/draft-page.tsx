import type * as React from 'react';
import type { PluginDraft } from '../../hooks/use-plugin-draft';
import type { PageOpening } from '../../utils/page-addresses';
import { PluginDraftBar } from '../draft-bar/plugin-draft-bar';
import { DraftCommentsLayer } from '../draft-comment/draft-comments-layer';
import { DraftRegionsProvider } from '../draft-region/draft-regions';

// A page's Draft tooling around its drawing: region tags, comment mode and the Draft bar, none of it for a page that is no dev Plugin's Draft (ADR-0057).
export function DraftPage({
  opening,
  draft: { bar, regions },
  children,
}: {
  opening: PageOpening;
  draft: PluginDraft;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <>
      <DraftRegionsProvider regions={regions} commenting={bar?.commenting}>
        <DraftCommentsLayer
          opening={opening}
          draft={bar !== null}
          commenting={bar?.commenting ?? false}
        >
          {children}
        </DraftCommentsLayer>
      </DraftRegionsProvider>
      <PluginDraftBar bar={bar} />
    </>
  );
}
