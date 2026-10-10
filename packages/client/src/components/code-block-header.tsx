import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { CodeBlockTitle } from './code-block-title';
import { CopyButton } from './copy-button';

export function CodeBlockHeader({
  title,
  copyValue,
  copyLabel = 'Copy code',
  resource,
  hasBody = true,
}: {
  title: string;
  copyValue: string;
  copyLabel?: string;
  resource?: { uri: string; description?: string };
  hasBody?: boolean;
}): React.JSX.Element {
  return (
    <View
      className={cn(
        'shrink-0 flex-row bg-sidebar pr-1.5 pl-3',
        resource
          ? 'items-start gap-2 py-2'
          : 'h-8 items-center justify-between',
        hasBody && 'border-b border-border',
      )}
    >
      {resource ? (
        <>
          <View className="h-5 w-icon-md shrink-0 items-center justify-center">
            <Icon
              name={resource.uri.startsWith('file://') ? 'file' : 'resource'}
              className="text-muted-foreground"
            />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="font-sans text-sm leading-5 text-foreground">
              {title}
            </Text>
            <ResourceUri uri={resource.uri} />
            {!!resource.description && (
              <Text className="font-sans text-sm leading-5 text-muted-foreground">
                {resource.description}
              </Text>
            )}
          </View>
        </>
      ) : (
        <CodeBlockTitle title={title} />
      )}
      <CopyButton value={copyValue} label={copyLabel} revealOnHover />
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
