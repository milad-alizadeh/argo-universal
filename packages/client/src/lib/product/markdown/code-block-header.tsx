import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/content/icon';
import { fileTypeIcon } from '../../generic/symbols/file-type-icon';
import { CodeBlockTitle } from './code-block-title/code-block-title';
import { CopyButton } from './copy-button';
import { type HeaderResource, ResourceHeading } from './resource-heading';

interface CodeBlockHeaderProps {
  title: string;
  copyValue: string;
  copyLabel?: string;
  resource?: HeaderResource;
}

function headerClassName(isResource: boolean): string {
  return cn(
    'shrink-0 flex-row pr-0.5 pl-3',
    isResource ? 'items-start gap-2 py-2' : 'h-8 items-center justify-between',
  );
}

function HeaderTitle({
  title,
  resource,
}: Pick<CodeBlockHeaderProps, 'title' | 'resource'>): React.JSX.Element {
  return resource ? (
    <ResourceHeading title={title} resource={resource} />
  ) : (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5 pr-2">
      <Icon
        name={
          ['bash', 'sh', 'shell', 'zsh'].includes(title)
            ? 'terminal'
            : fileTypeIcon(title.includes('.') ? title : `snippet.${title}`)
        }
        role="mark"
        className="shrink-0 text-muted-foreground"
      />
      <CodeBlockTitle title={title} />
    </View>
  );
}

export function CodeBlockHeader({
  title,
  copyValue,
  copyLabel = 'Copy code',
  resource,
}: CodeBlockHeaderProps): React.JSX.Element {
  return (
    <View className={headerClassName(resource !== undefined)}>
      <HeaderTitle title={title} resource={resource} />
      <CopyButton value={copyValue} label={copyLabel} revealOnHover />
    </View>
  );
}
