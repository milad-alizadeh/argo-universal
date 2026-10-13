import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { CodeBlockTitle } from './code-block-title/code-block-title';
import { CopyButton } from './copy-button';
import { type HeaderResource, ResourceHeading } from './resource-heading';

interface CodeBlockHeaderProps {
  title: string;
  copyValue: string;
  copyLabel?: string;
  resource?: HeaderResource;
  hasBody?: boolean;
}

function headerClassName(isResource: boolean, hasBody: boolean): string {
  return cn(
    'shrink-0 flex-row bg-sidebar pr-1.5 pl-3',
    isResource ? 'items-start gap-2 py-2' : 'h-8 items-center justify-between',
    hasBody && 'border-b border-border',
  );
}

function HeaderTitle({
  title,
  resource,
}: Pick<CodeBlockHeaderProps, 'title' | 'resource'>): React.JSX.Element {
  return resource ? (
    <ResourceHeading title={title} resource={resource} />
  ) : (
    <CodeBlockTitle title={title} />
  );
}

export function CodeBlockHeader({
  title,
  copyValue,
  copyLabel = 'Copy code',
  resource,
  hasBody = true,
}: CodeBlockHeaderProps): React.JSX.Element {
  return (
    <View className={headerClassName(resource !== undefined, hasBody)}>
      <HeaderTitle title={title} resource={resource} />
      <CopyButton value={copyValue} label={copyLabel} revealOnHover />
    </View>
  );
}
