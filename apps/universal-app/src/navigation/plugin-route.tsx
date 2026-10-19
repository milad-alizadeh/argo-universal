import {
  PageAtDrawerRoot,
  PluginDetailScreen,
  pluginPath,
  SectionListDetail,
  usePluginAt,
} from '@repo/client';
import { useWide } from '@repo/client/size-class';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { hasRowDetail, PluginRowDetails } from './plugin-row-detail';
import { drawerDrawsRootHeader } from './section-drawer-options';
import { MenuToolbar } from './section-root';
import { PageStack } from './section-stack';

type RowParams = { row?: string };

// A Row detail sits on its nav item's path, pushed above it, so only the page showing no Row detail is the root.
function useNavRoot(path: string, row: string | undefined): boolean {
  return usePluginAt(path).root && !hasRowDetail(row);
}

// Each Plugin nav item's pages, under its title on a narrow window; a path whose Plugin is unknown keeps ☰ to leave it.
export function PluginLayout(): React.JSX.Element {
  const pathname = usePathname();
  const { section } = usePluginAt(pathname);
  const root = useNavRoot(pathname, useGlobalSearchParams<RowParams>().row);

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
 * draws a root's header, so its Page hands the drawer its title and Actions. A ListDetail page puts its list in the
 * Frame's sidebar on a wide window.
 */
export function PluginRoot({ path }: PluginRootProps): React.JSX.Element {
  const { narrowRoot, drawerRoot } = useRootPlace(path);

  return (
    <PageAtDrawerRoot value={drawerRoot}>
      <SectionListDetail>
        <PluginRowDetails>
          <PluginDetailScreen path={path} />
        </PluginRowDetails>
      </SectionListDetail>
      {narrowRoot ? <PluginMenuToolbar /> : null}
    </PageAtDrawerRoot>
  );
}

interface RootPlace {
  narrowRoot: boolean;
  drawerRoot: boolean;
}

function useRootPlace(path: readonly string[]): RootPlace {
  const { row } = useLocalSearchParams<RowParams>();
  const root = useNavRoot(pluginPath(path), row);
  const wide = useWide();

  return {
    narrowRoot: root && !wide,
    drawerRoot: root && drawerDrawsRootHeader,
  };
}
