import type * as React from 'react';
import type { OpenPluginPage } from '../../../lib/product/plugin-actions';
import { PluginDetailView } from '../$path/plugin-detail-view';
import { usePluginPage, type PageOpening } from './use-plugin-page';

type PluginPageProps = PageOpening & {
  title: string;
  onOpenPage: OpenPluginPage;
  onBack: (() => void) | null;
};

const noEvents = (): Promise<void> =>
  Promise.reject(new Error('A Loader page sends no Plugin events'));

/*
 * A Loader page (ADR-0050), drawn by the App's registry from the Plugin tree its address answers. It
 * hides how trees are kept and asked for again, and how a Component event's Page state change or
 * Operation call is carried out; a Plugin event never arrives, because a Render passes none.
 */
export function PluginPage(props: PluginPageProps): React.ReactNode {
  const { title, onOpenPage, onBack, ...opening } = props;
  const page = usePluginPage(opening);

  return (
    <PluginDetailView
      title={title}
      root={page.root}
      callbacks={{ onEvent: noEvents, onOpenPage, onPageCall: page.onPageCall }}
      onBack={onBack}
    />
  );
}
