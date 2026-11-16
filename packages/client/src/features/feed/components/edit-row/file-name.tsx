import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { fileName } from '../../view/file-edit-label';

export function FileName({ path }: { path: string }): React.JSX.Element {
  return (
    <Text
      selectable={false}
      numberOfLines={1}
      role="body"
      tone="muted"
      className="min-w-0 shrink font-sans"
    >
      {fileName(path)}
    </Text>
  );
}
