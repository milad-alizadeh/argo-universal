import {
  PluginPage,
  type PluginSection,
  sectionOf,
  usePluginSections,
  useWide,
} from '@repo/client';
import { useLocalSearchParams, usePathname } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { MenuToolbar } from './section-root';
import { PageStack } from './section-stack';

interface ShownPlugin {
  section: PluginSection | undefined;
  root: boolean;
}

function useShownPlugin(): ShownPlugin {
  const { path = [] } = useLocalSearchParams<{ path?: string[] }>();
  const plugins = usePluginSections();

  const section = plugins.find(
    (plugin) => plugin.id === sectionOf(`plugins/${path.join('/')}`),
  );

  return { section, root: path.join('/') === section?.segments.join('/') };
}

export function PluginLayout(): React.JSX.Element {
  const path = usePathname();

  const section = usePluginSections().find(
    (plugin) => plugin.id === sectionOf(path),
  );

  const root = path === pluginRootPath(section);

  return (
    <PageStack
      header={{ title: section?.title ?? '' }}
      root={root}
      rootName="[...path]"
      singular
    />
  );
}

export function PluginRoute(): React.ReactNode {
  const { section, root } = useShownPlugin();
  const wide = useWide();

  if (!section) return null;

  return (
    <>
      <PluginPage name={section.name} />
      <PluginToolbar root={root} wide={wide} />
    </>
  );
}

const PluginMenuToolbar =
  Platform.OS === 'ios' ? MenuToolbar : (): null => null;

function PluginToolbar({
  root,
  wide,
}: {
  root: boolean;
  wide: boolean;
}): React.ReactNode {
  return root && !wide ? <PluginMenuToolbar /> : null;
}

function pluginRootPath(section: PluginSection | undefined): string {
  return section ? `/plugins/${section.segments.join('/')}` : '';
}
