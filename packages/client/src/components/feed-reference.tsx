import { FileDashedIcon, FileIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { CopyButton } from './copy-button';
import { FeedCodeBlock } from './feed-code-block';

export function ResourceReference({
  name,
  uri,
  description,
  text,
}: {
  name: string;
  uri: string;
  description?: string;
  text?: string;
}): React.JSX.Element {
  const header = (
    <View
      className={cn(
        'flex-row items-start gap-2 py-2 pl-3 pr-1.5',
        text !== undefined && 'border-b border-border',
      )}
    >
      <View className="h-5 w-icon-md shrink-0 items-center justify-center">
        <Icon
          as={uri.startsWith('file://') ? FileIcon : FileDashedIcon}
          className="text-muted-foreground"
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-sans text-sm leading-5 text-foreground">
          {name}
        </Text>
        <ResourceUri uri={uri} />
        {!!description && (
          <Text className="font-sans text-sm leading-5 text-muted-foreground">
            {description}
          </Text>
        )}
      </View>
      <CopyButton
        value={text ?? uri}
        label={text === undefined ? 'Copy URI' : 'Copy resource text'}
        revealOnHover
      />
    </View>
  );
  if (text !== undefined) return <FeedCodeBlock code={text} header={header} />;
  return (
    <View
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-sidebar',
        Platform.select({ web: 'code-block' }),
      )}
    >
      {header}
    </View>
  );
}

function ResourceUri({ uri }: { uri: string }): React.JSX.Element {
  const lastSlash = uri.lastIndexOf('/');
  const split = lastSlash >= 0 ? lastSlash + 1 : Math.ceil(uri.length / 2);
  return (
    <View accessible accessibilityLabel={uri} className="min-w-0 flex-row">
      <Text
        aria-hidden
        numberOfLines={1}
        className="min-w-0 shrink font-mono text-xs leading-4.5 text-muted-foreground"
      >
        {uri.slice(0, split)}
      </Text>
      <Text
        aria-hidden
        numberOfLines={1}
        ellipsizeMode="head"
        className="max-w-[75%] shrink-0 font-mono text-xs leading-4.5 text-muted-foreground"
      >
        {uri.slice(split)}
      </Text>
    </View>
  );
}

export function resourceName(uri: string): string {
  const path = uri.replace(/\/$/, '');
  return path.slice(path.lastIndexOf('/') + 1) || uri;
}
