import type * as React from 'react';
import type { OpenPluginPage } from '../../../lib/product/plugin-actions';
import type { PageOpening } from '../page-addresses';
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
  const { onPageCall } = page;
  const callbacks = { onOpenPage, onPageCall };

  return (
    <PluginDetailView
      title={title}
      root={page.root}
      callbacks={callbacks}
      onBack={onBack}
    />
  );
}
