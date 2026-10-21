import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { fileTypeIcon } from '../../../symbols/file-type-icon';
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
  if (resource) return <ResourceHeading title={title} resource={resource} />;

  if (!title) return <View className="flex-1" />;

  return <LanguageTitle title={title} />;
}

const shellLanguages = new Set(['bash', 'sh', 'shell', 'zsh']);

function languageIcon(
  title: string,
): NonNullable<React.ComponentProps<typeof Icon>['name']> {
  // A fence writes its language in lower case; a Shell card titles itself "Shell".
  if (shellLanguages.has(title.toLowerCase())) return 'terminal';

  return fileTypeIcon(title.includes('.') ? title : `snippet.${title}`);
}

function LanguageTitle({
  title,
}: Pick<CodeBlockHeaderProps, 'title'>): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5 pr-2">
      <Icon name={languageIcon(title)} role="body" tone="muted" />
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
