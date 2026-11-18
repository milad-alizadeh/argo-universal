import { useDeferredValue } from 'react';
import type * as React from 'react';
import {
  type PageOpening,
  PluginSessionRowProvider,
  useOpenPluginPage,
  usePluginLookup,
  usePluginPage,
} from '#features/plugins';
import type { OpenPluginPage } from '../../../lib/product/plugin-actions';
import { PluginSymbolContext } from '../../../lib/product/plugin-registry';
import { PluginDetailView } from './plugin-detail-view';

type PageViewProps = PageOpening & {
  title: string;
  onOpenPage: OpenPluginPage;
  onBack: (() => void) | null;
};

/*
 * A Loader page (ADR-0050), drawn by the App's registry from the Plugin tree its address answers. It
 * hides how trees are kept and asked for again, and how a Component event's Page state change or
 * Operation call is carried out.
 */
export function PluginPageDetailView(props: PageViewProps): React.ReactNode {
  const { title, onOpenPage, onBack, ...opening } = props;
  const page = usePluginPage(opening);
  // Let the destination paint its loading state even when its first tree is already cached.
  const root = useDeferredValue(page.root, null);
  const callbacks = { onOpenPage, onPageCall: page.onPageCall };

  return (
    <PluginSymbol pluginId={opening.pluginId}>
      <PluginDetailView
        title={title}
        root={root}
        callbacks={callbacks}
        onBack={onBack}
      />
    </PluginSymbol>
  );
}

// The Plugin's own icon, for a sign-in on its page that sends no mark of its own, and the page's kit Session rows.
function PluginSymbol(props: {
  pluginId: string;
  children: React.ReactNode;
}): React.ReactNode {
  const symbol = usePluginLookup()(props.pluginId).icon;

  return (
    <PluginSessionRowProvider onOpenPluginPage={useOpenPluginPage()}>
      <PluginSymbolContext value={symbol}>{props.children}</PluginSymbolContext>
    </PluginSessionRowProvider>
  );
}
