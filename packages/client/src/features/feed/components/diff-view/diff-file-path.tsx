import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';

function FolderName({ folder }: { folder: string }): React.JSX.Element {
  return (
    <View className="min-w-0 shrink">
      <Text selectable={false} numberOfLines={1} role="code" tone="muted">
        {folder}
      </Text>
    </View>
  );
}

function FileBaseName({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="max-w-full shrink-0">
      <Text selectable={false} numberOfLines={1} role="code">
        {name}
      </Text>
    </View>
  );
}

// The path starts beside its chevron; a long folder gives up its end, never the file name.
export function FilePath({ path }: { path: string }): React.JSX.Element {
  const slash = path.lastIndexOf('/');

  return (
    <View className="min-w-0 flex-1 flex-row items-center">
      <FolderName folder={path.slice(0, slash + 1)} />
      <FileBaseName name={path.slice(slash + 1)} />
    </View>
  );
}
