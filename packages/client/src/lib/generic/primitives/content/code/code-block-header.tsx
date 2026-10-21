import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/content/icon';
import { fileTypeIcon } from '../../../symbols/file-type-icon';
import { CodeBlockTitle } from './code-block-title/code-block-title';
import { CopyButton } from './copy-button';
import { type HeaderResource, ResourceHeading } from './resource-heading';

// The tray that holds a CodeBlockHeader and its body: code blocks, tool output and inline diffs.
export const codeBlockTray = 'overflow-hidden rounded-2xl bg-tint px-1 pb-1';

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
  if (resource) return <ResourceHeading title={title} resource={resource} />;

  if (!title) return <View className="flex-1" />;

  return <LanguageTitle title={title} />;
}

function languageIcon(
  title: string,
): NonNullable<React.ComponentProps<typeof Icon>['name']> {
  if (['bash', 'sh', 'shell', 'zsh'].includes(title)) return 'terminal';

  return fileTypeIcon(title.includes('.') ? title : `snippet.${title}`);
}

function LanguageTitle({
  title,
}: Pick<CodeBlockHeaderProps, 'title'>): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5 pr-2">
      <Icon name={languageIcon(title)} role="mark" tone="muted" />
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
