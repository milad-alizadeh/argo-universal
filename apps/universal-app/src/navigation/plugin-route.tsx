import {
  PluginDetailScreen,
  pluginPath,
  SectionListDetail,
  usePluginAt,
} from '@repo/client';
import { useWide } from '@repo/client/size-class';
import { useLocalSearchParams, usePathname } from 'expo-router';
import type * as React from 'react';
import { hasRowDetail, PluginRowDetails } from './plugin-row-detail';
import { useRepairPluginStack } from './repair-plugin-stack';
import { NarrowRoot } from './section-root';
import { ScreenStack } from './section-stack';

type RowParams = { row?: string };

// A Row detail sits on its nav item's path, pushed above it, so only the page showing no Row detail is the root.
function useNavRoot(path: string, row: string | undefined): boolean {
  return usePluginAt(path).root && !hasRowDetail(row);
}

/*
 * Each Plugin nav item's pages, under its title on a narrow window until the page's Screen mounts.
 * iOS 26 full-screen Back would steal a Canvas pan; Back from the edge remains available.
 */
export function PluginLayout(): React.JSX.Element {
  const { section } = usePluginAt(usePathname());

  return (
    <ScreenStack
      title={section?.title ?? ''}
      rootName="[...path]"
      singular
      fullScreenGestureEnabled={false}
    />
  );
}

interface PluginRootProps {
  path: readonly string[];
  // The Session the page opened for, from the route's params.
  sessionId: string | undefined;
  // The Project the page opened for, such as from a Project details row (ADR-0046).
  projectId: string | undefined;
}

/*
 * A Plugin page with, at a narrow root, ☰ in its Screen's header, as a section root has. A ListDetail page puts its
 * list in the Frame's sidebar on a wide window.
 */
export function PluginRoot(props: PluginRootProps): React.JSX.Element {
  useRepairBelow(props.path);

  return (
    <NarrowRoot root={useNarrowRoot(props.path)}>
      <SectionListDetail>
        <PluginRowDetails>
          <PluginDetailScreen {...props} />
        </PluginRowDetails>
      </SectionListDetail>
    </NarrowRoot>
  );
}

// The page's nav item is known once the Server's list of Plugins arrives.
function useRepairBelow(path: readonly string[]): void {
  const { section } = usePluginAt(pluginPath(path));

  useRepairPluginStack(
    path,
    section && [section.pluginId, section.navId, ...section.navPath],
  );
}

function useNarrowRoot(path: readonly string[]): boolean {
  const { row } = useLocalSearchParams<RowParams>();
  const root = useNavRoot(pluginPath(path), row);
  const wide = useWide();

  return root && !wide;
}
