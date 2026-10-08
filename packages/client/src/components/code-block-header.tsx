import type * as React from 'react';
import { View } from 'react-native';
import { CodeBlockTitle } from './code-block-title';
import { CopyButton } from './copy-button';

export function CodeBlockHeader({
  title,
  code,
}: {
  title: string;
  code: string;
}): React.JSX.Element {
  return (
    <View className="h-8 shrink-0 flex-row items-center justify-between border-b border-border bg-sidebar pr-1.5 pl-3">
      <CodeBlockTitle title={title} />
      <CopyButton value={code} label="Copy code" revealOnHover />
    </View>
  );
}
