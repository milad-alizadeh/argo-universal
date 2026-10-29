import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { PathText } from '#primitives/content/path-text';
import { fileTypeIcon } from '../../../symbols/file-type-icon';
import { CopyButton } from './copy-button';
import { type HeaderResource, ResourceHeading } from './resource-heading';

interface CodeBlockHeaderProps {
  title: string;
  copyValue: string;
  copyLabel?: string;
  resource?: HeaderResource;
  // Off under a row that already shows its own icon, such as a command's Shell or an edit's patch.
  icon?: boolean;
}

// The bar above the code, and the footer bar below it, which matches it.
export const codeBlockBarClassName = 'h-8 shrink-0 flex-row items-center px-3';

function headerClassName(isResource: boolean): string {
  return isResource
    ? 'shrink-0 flex-row items-start gap-2 px-3 py-2'
    : cn(codeBlockBarClassName, 'justify-between');
}

function HeaderTitle({
  title,
  resource,
  icon,
}: Pick<
  CodeBlockHeaderProps,
  'title' | 'resource' | 'icon'
>): React.JSX.Element {
  if (resource) return <ResourceHeading title={title} resource={resource} />;

  if (!title) return <View className="flex-1" />;

  return <LanguageTitle title={title} icon={icon} />;
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
  icon = true,
}: Pick<CodeBlockHeaderProps, 'title' | 'icon'>): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5 pr-2">
      {icon && <Icon name={languageIcon(title)} tone="muted" />}
      <PathText path={title} quiet testID="code-block-title" />
    </View>
  );
}

export function CodeBlockHeader({
  title,
  copyValue,
  copyLabel = 'Copy code',
  resource,
  icon,
}: CodeBlockHeaderProps): React.JSX.Element {
  return (
    <View className={headerClassName(resource !== undefined)}>
      <HeaderTitle title={title} resource={resource} icon={icon} />
      <CopyButton value={copyValue} label={copyLabel} revealOnHover />
    </View>
  );
}
