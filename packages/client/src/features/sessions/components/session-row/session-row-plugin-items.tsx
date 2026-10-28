import type * as React from 'react';
import { SessionRowItem } from './session-row-item';
import { SessionRowMore } from './session-row-more';
import type { OpenPluginPage, SessionRowPlugins } from './session-row-props';

export interface SessionRowPluginItemsProps {
  plugins?: SessionRowPlugins;
  onOpenPluginPage?: OpenPluginPage;
}

export const hasPluginItems = (
  plugins?: SessionRowPlugins,
): plugins is SessionRowPlugins => Boolean(plugins?.items.length);

// The Plugins' items after Argo's own, in the Plugins' order, then "+N" for the rest; both row layouts draw them.
export function SessionRowPluginItems({
  plugins,
  onOpenPluginPage,
}: SessionRowPluginItemsProps): React.ReactNode {
  if (!hasPluginItems(plugins)) return null;

  return (
    <>
      {plugins.items.map((plugin) => (
        <SessionRowItem key={plugin.key} {...{ plugin, onOpenPluginPage }} />
      ))}
      <SessionRowMore more={plugins.more} onOpenPluginPage={onOpenPluginPage} />
    </>
  );
}
