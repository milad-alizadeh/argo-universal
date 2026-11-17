import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { PathText } from '#primitives/content/path-text';
import { Text } from '#primitives/content/text';
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
  // The title's icon, where the title names no file or language, such as a diagram's.
  glyph?: IconName;
  // A short muted line beside the title, such as why a diagram shows as code.
  note?: string;
  // Controls after Copy, at the bar's end, such as a diagram's switch between its drawing and its code. Copy hides until hover, so a control before it would float off the edge.
  actions?: ReactNode;
}

// The bar above the code, and the footer bar below it, which matches it.
export const codeBlockBarClassName = 'h-8 shrink-0 flex-row items-center px-3';

function headerClassName(isResource: boolean): string {
  return isResource
    ? 'shrink-0 flex-row items-start gap-2 px-3 py-2'
    : cn(codeBlockBarClassName, 'justify-between');
}

type TitleProps = Pick<CodeBlockHeaderProps, 'title' | 'icon' | 'glyph'>;

function HeaderTitle({
  resource,
  ...title
}: TitleProps & Pick<CodeBlockHeaderProps, 'resource'>): React.JSX.Element {
  if (resource)
    return <ResourceHeading title={title.title} resource={resource} />;

  if (!title.title) return <View className="flex-1" />;

  return <LanguageTitle {...title} />;
}

const shellLanguages = new Set(['bash', 'sh', 'shell', 'zsh']);

type IconName = NonNullable<React.ComponentProps<typeof Icon>['name']>;

function languageIcon(title: string): IconName {
  // A fence writes its language in lower case; a Shell card titles itself "Shell".
  if (shellLanguages.has(title.toLowerCase())) return 'terminal';

  return fileTypeIcon(title.includes('.') ? title : `snippet.${title}`);
}

function TitleIcon({ title, glyph }: TitleProps): React.JSX.Element {
  return <Icon name={glyph ?? languageIcon(title)} tone="muted" />;
}

function LanguageTitle({
  icon = true,
  ...title
}: TitleProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5 pr-2">
      {icon && <TitleIcon {...title} />}
      <PathText path={title.title} quiet testID="code-block-title" />
    </View>
  );
}

function HeaderNote({ note }: { note?: string }): React.JSX.Element | null {
  if (!note) return null;

  return (
    <Text
      role="secondary"
      tone="muted"
      numberOfLines={1}
      className="shrink pr-2"
    >
      {note}
    </Text>
  );
}

export function CodeBlockHeader({
  copyValue,
  copyLabel = 'Copy code',
  ...header
}: CodeBlockHeaderProps): React.JSX.Element {
  return (
    <View className={headerClassName(header.resource !== undefined)}>
      <HeaderTitle {...header} />
      <HeaderNote note={header.note} />
      <CopyButton value={copyValue} label={copyLabel} revealOnHover />
      {header.actions}
    </View>
  );
}
