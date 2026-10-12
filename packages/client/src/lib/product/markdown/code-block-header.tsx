import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { Icon } from '../../generic/symbols/icon';
import { CodeBlockTitle } from './code-block-title/code-block-title';
import { CopyButton } from './copy-button';
import { resourceIcon } from './resource-name';

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
          <View className="h-6 w-icon-md shrink-0 items-center justify-center wide:h-5">
            <Icon
              role="control"
              name={resourceIcon(resource.uri)}
              className="text-muted-foreground"
            />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text>{title}</Text>
            <ResourceUri uri={resource.uri} />
            {!!resource.description && (
              <Text className="text-muted-foreground">
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
        role="code"
        className="min-w-0 shrink text-muted-foreground"
      >
        {uri.slice(0, split)}
      </Text>
      <Text
        aria-hidden
        numberOfLines={1}
        ellipsizeMode="head"
        role="code"
        className="max-w-[75%] shrink-0 text-muted-foreground"
      >
        {uri.slice(split)}
      </Text>
    </View>
  );
}
