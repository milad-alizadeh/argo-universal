import type * as React from 'react';
import { View } from 'react-native';
import { SessionRowItem } from './session-row-item';
import { SessionRowMore } from './session-row-more';
import type {
  OpenPluginItemPage,
  SessionRowPlugins,
} from './session-row-props';

export interface SessionRowPluginItemsProps {
  plugins?: SessionRowPlugins;
  onOpenPluginPage?: OpenPluginItemPage;
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

// A Compact row's one line holds a single item; the rest join "+N", so the title keeps its room.
export const compactItems = (
  plugins: SessionRowPlugins,
): SessionRowPlugins => ({
  ...plugins,
  items: plugins.items.slice(0, compactItemLimit),
  more: [...plugins.items.slice(compactItemLimit), ...plugins.more],
});

const compactItemLimit = 1;

// The row's accessories lane lets a press between items through to the row.
export function PluginAccessories(props: {
  className: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return <View pointerEvents="box-none" {...props} />;
}
