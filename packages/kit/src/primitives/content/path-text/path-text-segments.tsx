import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { PathParts } from './path-parts';

// The web's Text sets its own direction, so the right-to-left box is set on the Text itself.
const headFirst = 'web:[direction:rtl] web:text-left';

// On web the folder keeps left-to-right order inside the right-to-left text that ellipsizes its start.
const isolated = (folder: string): string =>
  Platform.OS === 'web' ? `⁦${folder}⁩` : folder;

const line = {
  selectable: false,
  numberOfLines: 1,
  ellipsizeMode: 'head',
  role: 'code',
} as const;

export function Folder({
  folder,
}: Pick<PathParts, 'folder'>): React.JSX.Element {
  return (
    <View className="min-w-0 shrink">
      <Text {...line} tone="muted" className={headFirst}>
        {isolated(folder)}
      </Text>
    </View>
  );
}

export function Name(
  props: Pick<PathParts, 'name'> & { quiet?: boolean },
): React.JSX.Element {
  return (
    <View className="max-w-full shrink-0">
      <Text {...line} tone={props.quiet ? 'muted' : undefined}>
        {props.name}
      </Text>
    </View>
  );
}

// The whole path on one line, for a box that scrolls it.
export function WholePath({ folder, name }: PathParts): React.JSX.Element {
  return (
    <>
      <Text selectable={false} role="code" tone="muted">
        {folder}
      </Text>
      <Text selectable={false} role="code">
        {name}
      </Text>
    </>
  );
}
