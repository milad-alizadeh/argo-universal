import {
  PageAtDrawerRoot,
  PluginDetailScreen,
  pluginPath,
  usePluginAt,
} from '@repo/client';
import { useWide } from '@repo/client/size-class';
import { usePathname } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { drawerDrawsRootHeader } from './section-drawer-options';
import { MenuToolbar } from './section-root';
import { PageStack } from './section-stack';

// Each Plugin nav item's pages, under its title on a narrow window; a path whose Plugin is unknown keeps ☰ to leave it.
export function PluginLayout(): React.JSX.Element {
  const { section, root } = usePluginAt(usePathname());

  return (
    <PageStack
      header={{ title: section?.title ?? '' }}
      root={root}
      rootName="[...path]"
      singular
    />
  );
}

const PluginMenuToolbar =
  Platform.OS === 'ios' ? MenuToolbar : (): null => null;

interface PluginRootProps {
  path: readonly string[];
}

/*
 * A Plugin page with, at a narrow root on iOS, ☰ as a stock bar button item, as a section root has. Android's drawer
 * draws a root's header, so its Page hands the drawer its title and Actions.
 */
export function PluginRoot({ path }: PluginRootProps): React.JSX.Element {
  const { narrowRoot, drawerRoot } = useRootPlace(path);

  return (
    <PageAtDrawerRoot value={drawerRoot}>
      <PluginDetailScreen path={path} />
      {narrowRoot ? <PluginMenuToolbar /> : null}
    </PageAtDrawerRoot>
  );
}

interface RootPlace {
  narrowRoot: boolean;
  drawerRoot: boolean;
}

function useRootPlace(path: readonly string[]): RootPlace {
  const { root } = usePluginAt(pluginPath(path));
  const wide = useWide();

  return {
    narrowRoot: root && !wide,
    drawerRoot: root && drawerDrawsRootHeader,
  };
}
