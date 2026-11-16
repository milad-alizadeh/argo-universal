import type * as React from 'react';
import { PluginSessionRowProvider, usePluginLookup } from '#features/plugins';
import type { OpenPluginPage } from '../../../lib/product/plugin-actions';
import { PluginSymbolContext } from '../../../lib/product/plugin-registry';
import type { PageOpening } from '../page-addresses';
import { useOpenPluginPage } from '../use-plugin-opener';
import { usePluginPage } from '../use-plugin-page';
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
  const callbacks = { onOpenPage, onPageCall: page.onPageCall };

  return (
    <PluginPageContexts pluginId={opening.pluginId}>
      <PluginDetailView
        title={title}
        root={page.root}
        callbacks={callbacks}
        onBack={onBack}
      />
    </PluginPageContexts>
  );
}

/*
 * The Plugin's own icon, for a sign-in on its page that sends no mark of its own; and the App's Session row for a
 * SessionRow in its tree.
 */
function PluginPageContexts(props: {
  pluginId: string;
  children: React.ReactNode;
}): React.ReactNode {
  const symbol = usePluginLookup()(props.pluginId).icon;

  return (
    <PluginSymbolContext value={symbol}>
      <PluginSessionRowProvider onOpenPluginPage={useOpenPluginPage()}>
        {props.children}
      </PluginSessionRowProvider>
    </PluginSymbolContext>
  );
}
