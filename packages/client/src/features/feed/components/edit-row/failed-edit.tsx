import type { ToolCallUpdate } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { toolCallFacts } from '../../view/feed-row-facts';
import type { FileDiff } from '../../view/file-diff';
import { FileName } from './file-name';

interface FailedEditProps {
  row: ToolCallUpdate;
  files: readonly FileDiff[];
}

const failedPath = ({ row, files }: FailedEditProps): string | undefined =>
  files[0]?.path ?? toolCallFacts(row).location;

const errorText = (row: ToolCallUpdate): string =>
  row.content
    .flatMap((block) =>
      block.type === 'content' && block.content.type === 'text'
        ? [block.content.text]
        : [],
    )
    .join(' ');

function FailedPath({ path }: { path?: string }): React.JSX.Element | null {
  return path ? (
    <FileName path={path} className="text-muted-foreground" />
  ) : null;
}

function FailedError({ error }: { error: string }): React.JSX.Element | null {
  if (!error) return null;

  return (
    <Text
      numberOfLines={1}
      role="body"
      className="min-w-0 shrink text-muted-foreground"
    >
      · {error}
    </Text>
  );
}

export function FailedEdit(props: FailedEditProps): React.JSX.Element {
  return (
    <View className="min-h-5 flex-row items-center gap-1.5">
      <Icon name="edit" className="shrink-0 text-danger" />
      <Text role="body" className="text-danger">
        Couldn't edit
      </Text>
      <FailedPath path={failedPath(props)} />
      <FailedError error={errorText(props.row)} />
    </View>
  );
}
